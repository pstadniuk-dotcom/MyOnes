/**
 * Smart Re-Order Service
 *
 * Orchestrates the member reorder flow:
 * 1. Creates reorder schedules when a member's order ships
 * 2. 5 days before supply end: analyzes wearable data + runs AI recommendation
 * 3. Sends SMS/email with findings → APPROVE / KEEP
 * 4. 2 days before supply end (if no reply): auto-defaults to KEEP
 * 5. Charges via PaymentIntent off_session
 * 6. Creates new order and new schedule for next cycle
 */

import OpenAI from 'openai';
import { logger } from '../../infra/logging/logger';
import { reorderRepository } from './reorder.repository';
import { wearableTrendAnalysisService, type WearableTrendAnalysis } from './wearableTrendAnalysis.service';
import { usersRepository } from '../users/users.repository';
import { formulasRepository } from '../formulas/formulas.repository';
import { notificationsService } from '../notifications/notifications.service';
import { notificationGate } from '../notifications/notification-gate.service';
import type { ReorderSchedule, ReorderRecommendation, User, Formula, HealthProfile } from '@shared/schema';
import { ALL_INGREDIENTS, findIngredientByName, type IngredientInfo } from '@shared/ingredients';

const SUPPLY_WEEKS = 8;
const REVIEW_DAYS_BEFORE = 5;    // Start AI review 5 days before supply ends
const AUTO_APPROVE_HOURS = 48;   // Auto-default to KEEP after 48h with no reply
const MAX_DELAYS_PER_CYCLE = 1;  // User can delay once per cycle (2 weeks)
const DELAY_DAYS = 14;           // Each delay adds 2 weeks

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Ingredient catalog lookup helpers ───────────────────────────────────

function findIngredient(name: string): IngredientInfo | undefined {
  return findIngredientByName(name);
}

// ── AI Recommendation Prompt Builder ────────────────────────────────────

function buildReorderRecommendationPrompt(
  trendAnalysis: WearableTrendAnalysis,
  currentFormula: Formula,
  user: User,
): string {
  const lines: string[] = [];

  lines.push(`You are Ones, an expert supplement practitioner. Your task is to review a member's 8-week wearable biometric data and determine if their current formula should be adjusted before their next shipment.`);
  lines.push('');
  lines.push(`=== MEMBER PROFILE ===`);
  lines.push(`Name: ${user.name || 'Member'}`);
  lines.push('');

  // Current formula
  lines.push(`=== CURRENT FORMULA (V${currentFormula.version}) ===`);
  lines.push(`Target capsules: ${currentFormula.targetCapsules}`);
  lines.push(`Total mg: ${currentFormula.totalMg}`);

  if (currentFormula.bases && Array.isArray(currentFormula.bases)) {
    lines.push(`\nBases:`);
    for (const base of currentFormula.bases as any[]) {
      lines.push(`  - ${base.ingredient}: ${base.amount}${base.unit || 'mg'}`);
    }
  }

  if (currentFormula.additions && Array.isArray(currentFormula.additions)) {
    lines.push(`\nAdditions:`);
    for (const add of currentFormula.additions as any[]) {
      lines.push(`  - ${add.ingredient}: ${add.amount}${add.unit || 'mg'}`);
    }
  }

  lines.push('');

  // Wearable trend data
  lines.push(`=== 8-WEEK WEARABLE DATA ANALYSIS ===`);
  lines.push(`Data quality: ${trendAnalysis.dataQuality} (${trendAnalysis.daysWithData}/${trendAnalysis.totalDays} days)`);
  lines.push('');

  if (trendAnalysis.findings.length > 0) {
    lines.push(`Trend Findings:`);
    for (const finding of trendAnalysis.findings) {
      const emoji = finding.trend === 'improving' ? '📈' : finding.trend === 'declining' ? '📉' : '➡️';
      lines.push(`  ${emoji} ${finding.detail}`);
    }
    lines.push('');
  }

  if (Object.keys(trendAnalysis.averages).length > 0) {
    lines.push(`8-Week Averages:`);
    const a = trendAnalysis.averages;
    if (a.sleepScore) lines.push(`  Sleep Score: ${a.sleepScore}/100`);
    if (a.sleepHours) lines.push(`  Sleep Duration: ${a.sleepHours}h`);
    if (a.deepSleepMinutes) lines.push(`  Deep Sleep: ${a.deepSleepMinutes} min`);
    if (a.remSleepMinutes) lines.push(`  REM Sleep: ${a.remSleepMinutes} min`);
    if (a.hrvMs) lines.push(`  HRV: ${a.hrvMs}ms`);
    if (a.restingHeartRate) lines.push(`  Resting HR: ${a.restingHeartRate} bpm`);
    if (a.recoveryScore) lines.push(`  Recovery: ${a.recoveryScore}%`);
    if (a.steps) lines.push(`  Daily Steps: ${a.steps.toLocaleString()}`);
    if (a.spo2) lines.push(`  SpO2: ${a.spo2}%`);
    lines.push('');
  }

  // Instructions
  lines.push(`=== YOUR TASK ===`);
  lines.push(`Based on the wearable trends and current formula, decide one of:`);
  lines.push(`1. "KEEP" - The current formula is working well. No changes needed.`);
  lines.push(`2. "ADJUST" - Recommend specific ingredient adjustments based on the data.`);
  lines.push('');
  lines.push(`RULES:`);
  lines.push(`- Only recommend changes if the wearable data clearly supports them.`);
  lines.push(`- Only use ingredients from the ONES approved catalog.`);
  lines.push(`- Dose changes must stay within approved min/max ranges.`);
  lines.push(`- Keep the total formula within the capsule budget.`);
  lines.push(`- If data quality is "poor" or "none", default to KEEP.`);
  lines.push(`- Be conservative — don't change things that are working.`);
  lines.push('');
  lines.push(`Respond with a JSON block in this exact format:`);
  lines.push('```json');
  lines.push(`{`);
  lines.push(`  "decision": "KEEP" | "ADJUST",`);
  lines.push(`  "trendSummary": "2-3 sentence summary of what the wearable data shows",`);
  lines.push(`  "findings": [`);
  lines.push(`    { "metric": "HRV", "trend": "improving|declining|stable", "detail": "description" }`);
  lines.push(`  ],`);
  lines.push(`  "recommendsChanges": true | false,`);
  lines.push(`  "suggestedChanges": [`);
  lines.push(`    {`);
  lines.push(`      "action": "add|remove|increase|decrease",`);
  lines.push(`      "ingredient": "Ingredient Name",`);
  lines.push(`      "currentDoseMg": 600,`);
  lines.push(`      "suggestedDoseMg": 900,`);
  lines.push(`      "rationale": "Why this change is recommended"`);
  lines.push(`    }`);
  lines.push(`  ],`);
  lines.push(`  "smsSummary": "1-2 sentences for the SMS nudge message (plain text, under 300 chars)"`);
  lines.push(`}`);
  lines.push('```');

  return lines.join('\n');
}

// ── Parse AI response ────────────────────────────────────────────────────

interface AIReorderDecision {
  decision: 'KEEP' | 'ADJUST';
  trendSummary: string;
  findings: Array<{
    metric: string;
    trend: 'improving' | 'declining' | 'stable';
    detail: string;
  }>;
  recommendsChanges: boolean;
  suggestedChanges?: Array<{
    action: 'add' | 'remove' | 'increase' | 'decrease';
    ingredient: string;
    currentDoseMg?: number;
    suggestedDoseMg?: number;
    rationale: string;
  }>;
  smsSummary: string;
}

function parseAIReorderResponse(response: string): AIReorderDecision | null {
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/i);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[1]);
    if (!parsed.decision || !['KEEP', 'ADJUST'].includes(parsed.decision)) return null;
    return parsed as AIReorderDecision;
  } catch {
    return null;
  }
}

// ── Core Service ─────────────────────────────────────────────────────────

export const reorderService = {
  /**
   * Create a reorder schedule for a member after their order ships.
   * Called from billing webhook when order status changes to 'shipped'.
   */
  async createScheduleForOrder(
    userId: string,
    formulaId: string,
    formulaVersion: number,
    shipDate: Date = new Date(),
  ): Promise<ReorderSchedule> {
    // Cancel any existing active schedules first
    await reorderRepository.cancelAllActiveSchedules(userId);

    const supplyEndDate = new Date(shipDate.getTime() + SUPPLY_WEEKS * 7 * 24 * 60 * 60 * 1000);

    return reorderRepository.createSchedule({
      userId,
      formulaId,
      formulaVersion,
      supplyStartDate: shipDate,
      supplyEndDate,
      status: 'active',
      delayCount: 0,
    });
  },

  /**
   * Run AI analysis for a schedule that's due for review.
   * Returns the recommendation record.
   */
  async runAIReview(schedule: ReorderSchedule): Promise<ReorderRecommendation> {
    const [user, formula] = await Promise.all([
      usersRepository.getUser(schedule.userId),
      formulasRepository.getFormula(schedule.formulaId),
    ]);

    if (!user || !formula) {
      throw new Error(`Missing user or formula for schedule ${schedule.id}`);
    }

    // Get 8-week wearable trend analysis
    const trendAnalysis = await wearableTrendAnalysisService.analyze8WeekTrends(schedule.userId);

    // Build AI prompt
    const prompt = buildReorderRecommendationPrompt(trendAnalysis, formula, user);

    // Call AI
    let aiDecision: AIReorderDecision;
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1500,
      });

      const responseText = completion.choices[0]?.message?.content || '';
      const parsed = parseAIReorderResponse(responseText);

      if (!parsed) {
        // Default to KEEP if AI response is unparseable
        aiDecision = {
          decision: 'KEEP',
          trendSummary: 'Unable to parse AI analysis. Defaulting to current formula.',
          findings: trendAnalysis.findings.map(f => ({
            metric: f.metric,
            trend: f.trend,
            detail: f.detail,
          })),
          recommendsChanges: false,
          smsSummary: `Your formula is up for reorder. All metrics look stable. Reply with your unique code to keep your current formula, or DELAY to push back 2 weeks.`,
        };
      } else {
        aiDecision = parsed;
      }
    } catch (err) {
      logger.error('[ReorderService] AI analysis failed', { error: err });
      aiDecision = {
        decision: 'KEEP',
        trendSummary: 'AI analysis temporarily unavailable. Defaulting to current formula.',
        findings: [],
        recommendsChanges: false,
        smsSummary: `Your formula is up for reorder. Reply with your unique code to keep your current formula, or DELAY to push back 2 weeks.`,
      };
    }

    // Update schedule status
    await reorderRepository.updateSchedule(schedule.id, { status: 'awaiting_approval' });

    // Create recommendation record
    const autoApproveAt = new Date(Date.now() + AUTO_APPROVE_HOURS * 60 * 60 * 1000);

    const recommendation = await reorderRepository.createRecommendation({
      scheduleId: schedule.id,
      userId: schedule.userId,
      analysisJson: {
        trendSummary: aiDecision.trendSummary,
        findings: aiDecision.findings,
        recommendsChanges: aiDecision.recommendsChanges,
        suggestedChanges: aiDecision.suggestedChanges,
      },
      recommendsChanges: aiDecision.recommendsChanges,
      status: 'pending',
      autoApproveAt,
    });

    return recommendation;
  },

  /**
   * Send SMS/email notification for a recommendation.
   */
  async sendReorderNotification(
    recommendation: ReorderRecommendation,
    schedule: ReorderSchedule,
  ): Promise<void> {
    const user = await usersRepository.getUser(schedule.userId);
    if (!user) return;

    const analysis = recommendation.analysisJson as AIReorderDecision;
    const smsBody = analysis?.smsSummary ||
      'Your ONES formula is up for reorder. Reply with your unique code to keep your current formula, or DELAY to push back 2 weeks.';

    const gateMeta = { scheduleId: schedule.id, recommendationId: recommendation.id };

    // Send SMS if user has phone + SMS opt-in + gate allows
    if (user.phone) {
      const smsAllowed = await notificationGate.canSend(schedule.userId, 'reorder_review', 'sms');
      if (smsAllowed) {
        try {
          const twilio = await import('twilio');
          const twilioClient = twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

          const token = recommendation.id.substring(0, 6).toUpperCase();
          const message = await twilioClient.messages.create({
            body: `ONES: ${smsBody}\n\nReply:\n• APPROVE ${token} - reorder with current formula\n• DELAY - push back 2 weeks`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: user.phone,
          });

          await reorderRepository.updateRecommendation(recommendation.id, {
            smsMessageSid: message.sid,
            smsSentAt: new Date(),
            status: 'sent',
          });

          await notificationGate.record(schedule.userId, 'smart_reorder', 'reorder_review', 'sms', gateMeta);
        } catch (err) {
          logger.error('[ReorderService] SMS send failed', { error: err });
        }
      }
    }

    // Send email if gate allows
    const emailAllowed = await notificationGate.canSend(schedule.userId, 'reorder_review', 'email');
    if (emailAllowed) {
      try {
        const { sendNotificationEmail } = await import('../../utils/emailService');

        const formula = await formulasRepository.getFormula(schedule.formulaId);
        const findings = analysis?.findings || [];
        const findingsHtml = findings.length > 0
          ? findings.map(f => {
            const emoji = f.trend === 'improving' ? '📈' : f.trend === 'declining' ? '📉' : '➡️';
            return `<li>${emoji} <strong>${f.metric}</strong>: ${f.detail}</li>`;
          }).join('')
          : '<li>No significant changes detected</li>';

        const frontendUrl = process.env.FRONTEND_URL || 'https://ones.health';

        await sendNotificationEmail({
          to: user.email,
          subject: 'Your ONES formula reorder is coming up',
          title: 'Smart Re-Order Review',
          type: 'formula_update',
          content: `
            <p>Hi ${user.name?.split(' ')[0] || 'there'},</p>
            <p>Your 8-week supply of Formula V${formula?.version || schedule.formulaVersion} is running low. Here's what your wearable data shows:</p>
            <ul>${findingsHtml}</ul>
            <p><strong>${analysis?.trendSummary || 'Your metrics have been stable.'}</strong></p>
            <p>${analysis?.recommendsChanges
              ? 'Based on your data, I have some formula adjustment suggestions ready for you.'
              : 'Your current formula appears to be working well — no changes recommended.'
            }</p>
            <p>Reply to the SMS we sent, or visit your dashboard to approve your reorder.</p>
          `,
          actionUrl: `${frontendUrl}/dashboard/formula`,
          actionText: 'Review Reorder',
        });

        await reorderRepository.updateRecommendation(recommendation.id, {
          emailSentAt: new Date(),
        });

        await notificationGate.record(schedule.userId, 'smart_reorder', 'reorder_review', 'email', gateMeta);
      } catch (err) {
        logger.error('[ReorderService] Email send failed', { error: err });
      }
    }

    // In-app notification (gate check)
    const inAppAllowed = await notificationGate.canSend(schedule.userId, 'reorder_review', 'in_app');
    if (inAppAllowed) {
      try {
        await notificationsService.create({
          userId: schedule.userId,
          type: 'formula_update',
          title: 'Reorder Review Ready',
          content: analysis?.recommendsChanges
            ? 'Your AI practitioner has formula adjustment suggestions based on 8 weeks of wearable data.'
            : 'Your formula reorder is ready. Your metrics look stable — approve to reorder.',
          formulaId: schedule.formulaId,
          metadata: {
            actionUrl: '/dashboard/formula',
            icon: 'sparkles',
            priority: 'high',
          },
        });

        await notificationGate.record(schedule.userId, 'smart_reorder', 'reorder_review', 'in_app', gateMeta);
      } catch (err) {
        logger.error('[ReorderService] Notification failed', { error: err });
      }
    }
  },

  /**
   * Handle user reply: APPROVE (keep current formula and charge).
   */
  async handleApprove(recommendation: ReorderRecommendation): Promise<void> {
    await reorderRepository.updateRecommendation(recommendation.id, {
      status: 'approved',
      smsReplyReceived: 'APPROVE',
      smsReplyAt: new Date(),
    });

    const schedule = await reorderRepository.getScheduleById(recommendation.scheduleId);
    if (schedule) {
      await reorderRepository.updateSchedule(schedule.id, { status: 'approved' });
    }
  },

  /**
   * Handle user reply: KEEP (same as APPROVE — keep current formula).
   * This is the auto-default if no reply within 48h.
   */
  async handleKeep(recommendation: ReorderRecommendation, isAutoApproved: boolean = false): Promise<void> {
    await reorderRepository.updateRecommendation(recommendation.id, {
      status: 'kept',
      smsReplyReceived: isAutoApproved ? 'AUTO_KEEP' : 'KEEP',
      smsReplyAt: new Date(),
    });

    const schedule = await reorderRepository.getScheduleById(recommendation.scheduleId);
    if (schedule) {
      await reorderRepository.updateSchedule(schedule.id, { status: 'approved' });
    }
  },

  /**
   * Handle user reply: DELAY (push reorder back 2 weeks, max 1 per cycle).
   */
  async handleDelay(recommendation: ReorderRecommendation): Promise<{ success: boolean; message: string }> {
    const schedule = await reorderRepository.getScheduleById(recommendation.scheduleId);
    if (!schedule) return { success: false, message: 'Schedule not found.' };

    if (schedule.delayCount >= MAX_DELAYS_PER_CYCLE) {
      return { success: false, message: 'You can only delay once per cycle. Reply APPROVE to reorder or contact support.' };
    }

    const newSupplyEnd = new Date(schedule.supplyEndDate.getTime() + DELAY_DAYS * 24 * 60 * 60 * 1000);

    await reorderRepository.updateSchedule(schedule.id, {
      status: 'active',  // Back to active — will be picked up again by scheduler
      supplyEndDate: newSupplyEnd,
      delayedUntil: newSupplyEnd,
      delayCount: schedule.delayCount + 1,
    });

    await reorderRepository.updateRecommendation(recommendation.id, {
      status: 'expired', // This recommendation is no longer relevant
      smsReplyReceived: 'DELAY',
      smsReplyAt: new Date(),
    });

    return { success: true, message: `Reorder delayed by 2 weeks. New reorder date: ${newSupplyEnd.toLocaleDateString()}.` };
  },

  /**
   * Auto-approve expired recommendations (no reply within 48h → default to KEEP).
   */
  async processAutoApprovals(): Promise<number> {
    const now = new Date();
    const expiredRecs = await reorderRepository.getRecommendationsPastDeadline(now);
    let count = 0;

    for (const rec of expiredRecs) {
      try {
        await this.handleKeep(rec, true);
        count++;
      } catch (err) {
        logger.error('[ReorderService] Auto-approve failed', { recommendationId: rec.id, error: err });
      }
    }

    return count;
  },

  /**
   * Charge approved schedules and create new orders.
   * Called by the scheduler after schedules move to 'approved' status.
   */
  async chargeApprovedOrders(): Promise<number> {
    const { epdGateway, isApproved } = await import('../billing/epd-gateway');
    const approved = await reorderRepository.getApprovedSchedulesReadyToCharge();
    let charged = 0;

    for (const schedule of approved) {
      try {
        const user = await usersRepository.getUser(schedule.userId);
        if (!user?.paymentVaultId) {
          logger.error('[ReorderService] No payment vault ID for user', { userId: schedule.userId });
          continue;
        }

        // Check if there's an approved recommendation with adjustments
        let chargeFormulaId = schedule.formulaId;
        const recommendation = await reorderRepository.getRecommendationByScheduleId(schedule.id);
        if (recommendation && recommendation.recommendsChanges) {
          const analysis = recommendation.analysisJson as AIReorderDecision;
          if (analysis?.suggestedChanges && analysis.suggestedChanges.length > 0) {
            if ((recommendation as any).adjustedFormulaId) {
              chargeFormulaId = (recommendation as any).adjustedFormulaId;
              logger.info('[ReorderService] Using adjusted formula for reorder', {
                scheduleId: schedule.id,
                originalFormulaId: schedule.formulaId,
                adjustedFormulaId: chargeFormulaId,
              });
            }
          }
        }

        const formula = await formulasRepository.getFormula(chargeFormulaId);
        if (!formula) continue;

        // Get fresh price quote
        const { formulasService } = await import('../formulas/formulas.service');
        const quoteResult = await formulasService.getFormulaQuote(schedule.userId, chargeFormulaId);
        if (!quoteResult.quote.available || !quoteResult.quote.total) {
          logger.error('[ReorderService] Quote unavailable for formula', { formulaId: schedule.formulaId });
          continue;
        }

        // Apply member discount (15%)
        const MEMBER_DISCOUNT = 0.85;
        const priceCents = Math.round(quoteResult.quote.total * 100 * MEMBER_DISCOUNT);
        const chargeAmount = (priceCents / 100).toFixed(2);

        // Charge via EPD Customer Vault
        const result = await epdGateway.chargeVault({
          customer_vault_id: user.paymentVaultId,
          amount: chargeAmount,
          orderid: `ones-reorder-${schedule.id.slice(0, 8)}-${Date.now()}`,
          orderdescription: `ONES Smart Re-Order - Formula V${schedule.formulaVersion}`,
          stored_credential_indicator: 'used',
          initiated_by: 'merchant',
          initial_transaction_id: user.initialTransactionId || undefined,
          billing_method: 'recurring',
        });

        if (isApproved(result)) {
          // Create order record
          const order = await usersRepository.createOrder({
            userId: schedule.userId,
            formulaId: chargeFormulaId,
            formulaVersion: schedule.formulaVersion,
            status: 'pending',
            amountCents: priceCents,
            supplyWeeks: SUPPLY_WEEKS,
            gatewayTransactionId: result.transactionid,
            autoShipSubscriptionId: schedule.id,
          });

          // Update schedule as charged
          await reorderRepository.updateSchedule(schedule.id, {
            status: 'charged',
            gatewayTransactionId: result.transactionid,
            chargedAt: new Date(),
            chargePriceCents: priceCents,
            orderId: order.id,
          });

          // Create next cycle's schedule
          await this.createScheduleForOrder(
            schedule.userId,
            schedule.formulaId,
            schedule.formulaVersion,
            new Date(),
          );

          charged++;

          // Send order confirmation
          try {
            await notificationsService.create({
              userId: schedule.userId,
              type: 'order_update',
              title: 'Reorder Placed',
              content: `Your Formula V${schedule.formulaVersion} reorder has been placed ($${chargeAmount}).`,
              metadata: {
                actionUrl: '/dashboard/formula',
                icon: 'package',
                priority: 'medium',
              },
            });
          } catch { /* non-critical */ }
        } else {
          // Payment declined
          const currentAttempts = (schedule as any).paymentAttempts ?? 0;
          const nextAttempts = currentAttempts + 1;

          if (nextAttempts < 3) {
            await reorderRepository.updateSchedule(schedule.id, {
              paymentAttempts: nextAttempts,
            } as any);
            logger.warn('[ReorderService] Payment declined, will retry', {
              scheduleId: schedule.id, userId: schedule.userId,
              attempt: nextAttempts, maxAttempts: 3,
              responsetext: result.responsetext,
            });
          } else {
            await reorderRepository.updateSchedule(schedule.id, {
              status: 'skipped',
              paymentAttempts: nextAttempts,
            } as any);
            logger.error('[ReorderService] Payment failed after 3 attempts — marking schedule as skipped', {
              scheduleId: schedule.id, userId: schedule.userId,
            });

            try {
              await notificationsService.create({
                userId: schedule.userId,
                type: 'order_update',
                title: 'Reorder Payment Failed',
                content: `We were unable to process payment for your reorder after multiple attempts. Please update your payment method to continue.`,
                metadata: { actionUrl: '/dashboard/billing', icon: 'alert-triangle', priority: 'high' },
              });
            } catch { /* non-critical */ }
          }
        }
      } catch (err: any) {
        logger.error('[ReorderService] Charge failed', {
          scheduleId: schedule.id, userId: schedule.userId, error: err?.message || err,
        });
      }
    }

    return charged;
  },

  /**
   * Get the current reorder status for a user (for dashboard display).
   */
  async getUserReorderStatus(userId: string): Promise<{
    schedule: ReorderSchedule | null;
    recommendation: ReorderRecommendation | null;
    daysUntilReorder: number | null;
    canDelay: boolean;
  }> {
    const schedule = await reorderRepository.getActiveScheduleByUser(userId);
    if (!schedule) {
      return { schedule: null, recommendation: null, daysUntilReorder: null, canDelay: false };
    }

    const recommendation = await reorderRepository.getRecommendationByScheduleId(schedule.id);
    const now = new Date();
    const daysUntilReorder = Math.max(0, Math.ceil(
      (schedule.supplyEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    ));

    return {
      schedule,
      recommendation,
      daysUntilReorder,
      canDelay: schedule.delayCount < MAX_DELAYS_PER_CYCLE,
    };
  },
};
