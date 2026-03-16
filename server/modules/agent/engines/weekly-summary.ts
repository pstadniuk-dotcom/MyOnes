/**
 * Weekly PR Summary Email — Send a digest of PR activity to admin
 *
 * Uses the existing SendGrid email service to send a weekly recap:
 * - New prospects discovered
 * - Pitches pending review
 * - Responses received
 * - Upcoming follow-ups
 * - Bookings confirmed
 * - Cost tracking
 */
import logger from '../../../infra/logging/logger';
import { agentRepository } from '../agent.repository';
import { getMonthlySpend } from '../tools/cost-tracker';
import { sendNotificationEmail } from '../../../utils/emailService';

export interface WeeklySummary {
  period: { start: string; end: string };
  newProspects: number;
  pitchesPendingReview: number;
  pitchesSent: number;
  responsesReceived: number;
  positiveResponses: number;
  followUpsDue: number;
  bookingsConfirmed: number;
  monthlySpend: { totalUsd: number; budgetUsd: number; percentUsed: number };
  topProspects: Array<{ name: string; score: number; status: string }>;
}

/**
 * Generate weekly PR summary data
 */
export async function generateWeeklySummary(): Promise<WeeklySummary> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const stats = await agentRepository.getStats();

  // Get prospects discovered this week
  const { prospects: allProspects } = await agentRepository.listProspects({ limit: 100 });
  const newProspects = allProspects.filter(p =>
    p.discoveredAt && new Date(p.discoveredAt) >= weekAgo
  );

  // Get pitches pending review
  const { pitches: pendingPitches } = await agentRepository.listPitches({ status: 'pending_review' });

  // Get pitches sent this week
  const { pitches: sentPitches } = await agentRepository.listPitches({ status: 'sent' });
  const sentThisWeek = sentPitches.filter(p =>
    p.sentAt && new Date(p.sentAt) >= weekAgo
  );

  // Get responses
  const respondedProspects = allProspects.filter(p => p.status === 'responded');
  const bookedProspects = allProspects.filter(p => p.status === 'booked' || p.status === 'published');

  // Get follow-ups due
  const pendingFollowUps = await agentRepository.getPendingFollowUps();

  // Get monthly spend
  let monthlySpend = { totalCostUsd: 0, budgetUsd: 500, budgetUsedPercent: 0 };
  try {
    const spend = await getMonthlySpend();
    monthlySpend = { totalCostUsd: spend.totalCostUsd, budgetUsd: spend.budgetUsd, budgetUsedPercent: spend.budgetUsedPercent };
  } catch {
    // Cost tracking may not have data yet
  }

  // Top prospects by score
  const topProspects = allProspects
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
    .slice(0, 5)
    .map(p => ({ name: p.name, score: p.relevanceScore || 0, status: p.status }));

  return {
    period: { start: weekAgo.toISOString(), end: now.toISOString() },
    newProspects: newProspects.length,
    pitchesPendingReview: pendingPitches.length,
    pitchesSent: sentThisWeek.length,
    responsesReceived: respondedProspects.length,
    positiveResponses: respondedProspects.filter(p => p.status === 'responded').length,
    followUpsDue: pendingFollowUps.length,
    bookingsConfirmed: bookedProspects.length,
    monthlySpend: {
      totalUsd: monthlySpend.totalCostUsd,
      budgetUsd: monthlySpend.budgetUsd,
      percentUsed: monthlySpend.budgetUsedPercent * 100,
    },
    topProspects,
  };
}

/**
 * Send weekly PR summary email to admin
 */
export async function sendWeeklySummaryEmail(adminEmail: string): Promise<boolean> {
  try {
    const summary = await generateWeeklySummary();

    const content = `
<h2>Weekly PR Agent Summary</h2>
<p>Here's your PR outreach activity for the past 7 days:</p>

<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr style="border-bottom:1px solid #e5e7eb;">
    <td style="padding:8px 0;"><strong>New Prospects Discovered</strong></td>
    <td style="padding:8px 0;text-align:right;">${summary.newProspects}</td>
  </tr>
  <tr style="border-bottom:1px solid #e5e7eb;">
    <td style="padding:8px 0;"><strong>Pitches Pending Review</strong></td>
    <td style="padding:8px 0;text-align:right;">${summary.pitchesPendingReview}</td>
  </tr>
  <tr style="border-bottom:1px solid #e5e7eb;">
    <td style="padding:8px 0;"><strong>Pitches Sent This Week</strong></td>
    <td style="padding:8px 0;text-align:right;">${summary.pitchesSent}</td>
  </tr>
  <tr style="border-bottom:1px solid #e5e7eb;">
    <td style="padding:8px 0;"><strong>Responses Received</strong></td>
    <td style="padding:8px 0;text-align:right;">${summary.responsesReceived}</td>
  </tr>
  <tr style="border-bottom:1px solid #e5e7eb;">
    <td style="padding:8px 0;"><strong>Follow-Ups Due</strong></td>
    <td style="padding:8px 0;text-align:right;">${summary.followUpsDue}</td>
  </tr>
  <tr style="border-bottom:1px solid #e5e7eb;">
    <td style="padding:8px 0;"><strong>Bookings Confirmed</strong></td>
    <td style="padding:8px 0;text-align:right;">${summary.bookingsConfirmed}</td>
  </tr>
  <tr>
    <td style="padding:8px 0;"><strong>Monthly AI Spend</strong></td>
    <td style="padding:8px 0;text-align:right;">$${summary.monthlySpend.totalUsd.toFixed(2)} / $${summary.monthlySpend.budgetUsd} (${summary.monthlySpend.percentUsed.toFixed(0)}%)</td>
  </tr>
</table>

${summary.topProspects.length > 0 ? `
<h3>Top Prospects</h3>
<ul>
${summary.topProspects.map(p => `<li><strong>${p.name}</strong> — Score: ${p.score}, Status: ${p.status}</li>`).join('\n')}
</ul>
` : ''}

<p style="margin-top:16px;color:#6b7280;font-size:13px;">
  ${summary.pitchesPendingReview > 0 ? `You have ${summary.pitchesPendingReview} pitches waiting for your review.` : 'All pitches have been reviewed.'}
</p>
`;

    await sendNotificationEmail({
      to: adminEmail,
      subject: `PR Weekly: ${summary.newProspects} prospects, ${summary.pitchesSent} sent, ${summary.responsesReceived} responses`,
      title: 'Weekly PR Summary',
      content,
      actionUrl: '/admin/pr-agent',
      actionText: 'Open PR Dashboard',
      type: 'system',
    });

    logger.info(`[weekly-summary] Sent weekly PR summary to ${adminEmail}`);
    return true;
  } catch (err: any) {
    logger.error(`[weekly-summary] Failed to send: ${err.message}`);
    return false;
  }
}
