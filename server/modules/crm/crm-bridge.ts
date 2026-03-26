/**
 * CRM Bridge — Auto-creates CRM records when agent events occur
 *
 * Hooks into the outreach agent workflow:
 * - Prospect created → CRM contact + deal
 * - Pitch sent → CRM activity
 * - Response detected → CRM activity + deal stage update
 * - Follow-up sent → CRM activity
 */
import { crmRepository } from './crm.repository';
import logger from '../../infra/logging/logger';
import type { OutreachProspect, OutreachPitch } from '@shared/schema';

// Map outreach category to CRM deal category
function mapCategory(category: string): 'podcast' | 'press' | 'investor' | 'b2b' | 'partnership' | 'other' {
  if (category === 'podcast' || category === 'press' || category === 'investor') return category;
  return 'other';
}

// Map outreach prospect status to CRM deal stage
function mapStatus(status: string): 'lead' | 'contacted' | 'responded' | 'meeting' | 'negotiation' | 'closed_won' | 'closed_lost' {
  switch (status) {
    case 'new': return 'lead';
    case 'pitched': case 'manually_contacted': return 'contacted';
    case 'responded': return 'responded';
    case 'booked': return 'meeting';
    case 'published': return 'closed_won';
    case 'rejected': case 'cold': return 'closed_lost';
    default: return 'lead';
  }
}

/**
 * Ensure a CRM contact + deal exist for an outreach prospect.
 * Idempotent — if already linked, returns existing records.
 */
export async function ensureCrmRecords(prospect: OutreachProspect): Promise<{
  contactId: string;
  dealId: string;
}> {
  try {
    // Check if contact already exists
    let contact = await crmRepository.getContactByOutreachProspectId(prospect.id);

    if (!contact) {
      // Also check by email to avoid duplicates
      if (prospect.contactEmail) {
        contact = await crmRepository.getContactByEmail(prospect.contactEmail);
        if (contact && !contact.outreachProspectId) {
          // Link existing contact to this prospect
          await crmRepository.updateContact(contact.id, { outreachProspectId: prospect.id });
        }
      }
    }

    if (!contact) {
      contact = await crmRepository.createContact({
        name: prospect.hostName || prospect.name,
        email: prospect.contactEmail || undefined,
        company: prospect.publicationName || prospect.name,
        type: 'person',
        website: prospect.url,
        source: `agent_${prospect.category}`,
        leadScore: prospect.relevanceScore || 0,
        outreachProspectId: prospect.id,
        tags: [prospect.category, ...(prospect.topics || []).slice(0, 3)],
      });
    }

    // Check if deal already exists
    let deal = await crmRepository.getDealByOutreachProspectId(prospect.id);

    if (!deal) {
      deal = await crmRepository.createDeal({
        contactId: contact.id,
        outreachProspectId: prospect.id,
        title: `${prospect.category === 'investor' ? 'Investment' : prospect.category === 'podcast' ? 'Podcast Booking' : 'Press Coverage'}: ${prospect.name}`,
        stage: mapStatus(prospect.status),
        category: mapCategory(prospect.category),
        tags: [prospect.category],
      });
    }

    return { contactId: contact.id, dealId: deal.id };
  } catch (err: any) {
    logger.warn(`[crm-bridge] Failed to ensure CRM records for prospect ${prospect.id}: ${err.message}`);
    throw err;
  }
}

/**
 * Log a pitch-related activity to the CRM timeline
 */
export async function logPitchActivity(
  prospect: OutreachProspect,
  pitch: OutreachPitch,
  activityType: 'pitch_drafted' | 'pitch_approved' | 'pitch_sent' | 'follow_up_sent',
): Promise<void> {
  try {
    const { contactId, dealId } = await ensureCrmRecords(prospect);

    await crmRepository.createActivity({
      contactId,
      dealId,
      type: activityType,
      subject: pitch.subject,
      body: activityType === 'pitch_sent' || activityType === 'follow_up_sent'
        ? `Sent via ${pitch.sentVia || 'email'}`
        : undefined,
      metadata: { pitchId: pitch.id, pitchType: pitch.pitchType, sentVia: pitch.sentVia } as Record<string, any>,
      createdBy: 'agent',
    });

    // Update deal stage based on activity
    if (activityType === 'pitch_sent' || activityType === 'follow_up_sent') {
      const deal = await crmRepository.getDealById(dealId);
      if (deal && deal.stage === 'lead') {
        await crmRepository.updateDeal(dealId, { stage: 'contacted' });
        await crmRepository.createActivity({
          contactId,
          dealId,
          type: 'deal_stage_changed',
          subject: 'Stage: Lead → Contacted',
          metadata: { from: 'lead', to: 'contacted', trigger: activityType } as Record<string, any>,
          createdBy: 'agent',
        });
      }
    }
  } catch (err: any) {
    logger.warn(`[crm-bridge] Failed to log pitch activity: ${err.message}`);
    // Non-fatal — don't break the pitch flow
  }
}

/**
 * Log a response detection to the CRM timeline
 */
export async function logResponseDetected(
  prospect: OutreachProspect,
  classification: string,
  snippet: string,
): Promise<void> {
  try {
    const { contactId, dealId } = await ensureCrmRecords(prospect);

    await crmRepository.createActivity({
      contactId,
      dealId,
      type: 'response_detected',
      subject: `Response: ${classification}`,
      body: snippet.substring(0, 500),
      metadata: { classification, prospectId: prospect.id } as Record<string, any>,
      createdBy: 'agent',
    });

    // Move deal stage based on response
    const deal = await crmRepository.getDealById(dealId);
    if (deal) {
      let newStage: string | null = null;
      if (classification === 'interested') newStage = 'responded';
      else if (classification === 'declined') newStage = 'closed_lost';

      if (newStage && deal.stage !== newStage) {
        await crmRepository.updateDeal(dealId, {
          stage: newStage as any,
          ...(newStage === 'closed_lost' ? { closedAt: new Date(), lostReason: `Response: ${classification}` } : {}),
        });
        await crmRepository.createActivity({
          contactId,
          dealId,
          type: 'deal_stage_changed',
          subject: `Stage: ${deal.stage} → ${newStage}`,
          metadata: { from: deal.stage, to: newStage, trigger: 'response_detected', classification } as Record<string, any>,
          createdBy: 'agent',
        });
      }
    }
  } catch (err: any) {
    logger.warn(`[crm-bridge] Failed to log response detected: ${err.message}`);
  }
}
