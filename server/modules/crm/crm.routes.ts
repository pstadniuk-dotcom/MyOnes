/**
 * CRM Routes — Express routes for the CRM system
 *
 * Mounted at /api/admin/crm — all routes require admin auth.
 */
import { Router, type Request, type Response } from 'express';
import { crmRepository } from './crm.repository';
import { ensureCrmRecords } from './crm-bridge';
import logger from '../../infra/logging/logger';

const router = Router();

// ── Stats ──────────────────────────────────────────────────────────────────

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await crmRepository.getStats();
    res.json(stats);
  } catch (err: any) {
    logger.error('[crm] Failed to get stats', { error: err.message });
    res.status(500).json({ error: 'Failed to get CRM stats' });
  }
});

// ── Contacts ───────────────────────────────────────────────────────────────

router.get('/contacts', async (req: Request, res: Response) => {
  try {
    const { search, type, source, minScore, limit, offset, sortBy, sortDir } = req.query;
    const result = await crmRepository.listContacts({
      search: search as string,
      type: type as any,
      source: source as string,
      minScore: minScore ? parseInt(minScore as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      sortBy: sortBy as string,
      sortDir: sortDir as 'asc' | 'desc',
    });
    res.json(result);
  } catch (err: any) {
    logger.error('[crm] Failed to list contacts', { error: err.message });
    res.status(500).json({ error: 'Failed to list contacts' });
  }
});

router.get('/contacts/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const contacts = await crmRepository.searchContacts(q);
    res.json(contacts);
  } catch (err: any) {
    res.status(500).json({ error: 'Search failed' });
  }
});

router.get('/contacts/:id', async (req: Request, res: Response) => {
  try {
    const contact = await crmRepository.getContactById(req.params.id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    res.json(contact);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get contact' });
  }
});

router.post('/contacts', async (req: Request, res: Response) => {
  try {
    const contact = await crmRepository.createContact(req.body);
    res.status(201).json(contact);
  } catch (err: any) {
    logger.error('[crm] Failed to create contact', { error: err.message });
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

router.patch('/contacts/:id', async (req: Request, res: Response) => {
  try {
    await crmRepository.updateContact(req.params.id, req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

router.delete('/contacts/:id', async (req: Request, res: Response) => {
  try {
    await crmRepository.deleteContact(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// ── Contact Activities ─────────────────────────────────────────────────────

router.get('/contacts/:id/activities', async (req: Request, res: Response) => {
  try {
    const activities = await crmRepository.getActivitiesByContact(req.params.id);
    res.json(activities);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get activities' });
  }
});

// ── Contact Deals ──────────────────────────────────────────────────────────

router.get('/contacts/:id/deals', async (req: Request, res: Response) => {
  try {
    const { deals } = await crmRepository.listDeals({ contactId: req.params.id });
    res.json(deals);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get contact deals' });
  }
});

// ── Deals ──────────────────────────────────────────────────────────────────

router.get('/deals', async (req: Request, res: Response) => {
  try {
    const { stage, category, contactId, limit, offset } = req.query;
    const result = await crmRepository.listDeals({
      stage: stage as string,
      category: category as string,
      contactId: contactId as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json(result);
  } catch (err: any) {
    logger.error('[crm] Failed to list deals', { error: err.message });
    res.status(500).json({ error: 'Failed to list deals' });
  }
});

router.get('/deals/pipeline', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const pipeline = await crmRepository.getDealsPipeline({
      category: category as string,
    });
    res.json(pipeline);
  } catch (err: any) {
    logger.error('[crm] Failed to get pipeline', { error: err.message });
    res.status(500).json({ error: 'Failed to get pipeline' });
  }
});

router.get('/deals/funnel', async (req: Request, res: Response) => {
  try {
    const [stageCounts, pipelineValue] = await Promise.all([
      crmRepository.getDealCountsByStage(),
      crmRepository.getPipelineValue(),
    ]);
    res.json({ stageCounts, pipelineValue });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get funnel data' });
  }
});

router.get('/deals/:id', async (req: Request, res: Response) => {
  try {
    const deal = await crmRepository.getDealById(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    res.json(deal);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get deal' });
  }
});

router.post('/deals', async (req: Request, res: Response) => {
  try {
    const deal = await crmRepository.createDeal(req.body);
    // Log the creation as an activity
    await crmRepository.createActivity({
      contactId: deal.contactId,
      dealId: deal.id,
      type: 'note',
      subject: `Deal created: ${deal.title}`,
      createdBy: (req as any).userId || 'admin',
    });
    res.status(201).json(deal);
  } catch (err: any) {
    logger.error('[crm] Failed to create deal', { error: err.message });
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

router.patch('/deals/:id', async (req: Request, res: Response) => {
  try {
    const existing = await crmRepository.getDealById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Deal not found' });

    await crmRepository.updateDeal(req.params.id, req.body);

    // Log stage change as activity
    if (req.body.stage && req.body.stage !== existing.stage) {
      await crmRepository.createActivity({
        contactId: existing.contactId,
        dealId: existing.id,
        type: 'deal_stage_changed',
        subject: `Stage: ${existing.stage} → ${req.body.stage}`,
        metadata: { from: existing.stage, to: req.body.stage } as Record<string, any>,
        createdBy: (req as any).userId || 'admin',
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

router.delete('/deals/:id', async (req: Request, res: Response) => {
  try {
    await crmRepository.deleteDeal(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

// ── Deal Activities ────────────────────────────────────────────────────────

router.get('/deals/:id/activities', async (req: Request, res: Response) => {
  try {
    const activities = await crmRepository.getActivitiesByDeal(req.params.id);
    res.json(activities);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get deal activities' });
  }
});

// ── Activities ─────────────────────────────────────────────────────────────

router.get('/activities/recent', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
    const activities = await crmRepository.getRecentActivities(limit);
    res.json(activities);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get recent activities' });
  }
});

router.get('/activities/tasks', async (req: Request, res: Response) => {
  try {
    const [upcoming, overdue] = await Promise.all([
      crmRepository.getUpcomingTasks(),
      crmRepository.getOverdueTasks(),
    ]);
    res.json({ upcoming, overdue });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

router.post('/activities', async (req: Request, res: Response) => {
  try {
    const activity = await crmRepository.createActivity({
      ...req.body,
      createdBy: (req as any).userId || 'admin',
    });
    res.status(201).json(activity);
  } catch (err: any) {
    logger.error('[crm] Failed to create activity', { error: err.message });
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

router.patch('/activities/:id', async (req: Request, res: Response) => {
  try {
    await crmRepository.updateActivity(req.params.id, req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

router.post('/activities/:id/complete', async (req: Request, res: Response) => {
  try {
    await crmRepository.completeTask(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

router.delete('/activities/:id', async (req: Request, res: Response) => {
  try {
    await crmRepository.deleteActivity(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

// ── Saved Views ────────────────────────────────────────────────────────────

router.get('/views', async (req: Request, res: Response) => {
  try {
    const entity = req.query.entity as string;
    const views = await crmRepository.listSavedViews(entity);
    res.json(views);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list views' });
  }
});

router.post('/views', async (req: Request, res: Response) => {
  try {
    const view = await crmRepository.createSavedView({
      ...req.body,
      createdBy: (req as any).userId || 'admin',
    });
    res.status(201).json(view);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create view' });
  }
});

router.delete('/views/:id', async (req: Request, res: Response) => {
  try {
    await crmRepository.deleteSavedView(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete view' });
  }
});

// ── Sync (Backfill existing outreach prospects → CRM) ──────────────────────

router.post('/sync-prospects', async (req: Request, res: Response) => {
  try {
    const { agentRepository } = await import('../agent/agent.repository');
    const { prospects } = await agentRepository.listProspects({ limit: 500 });

    let created = 0;
    let skipped = 0;
    for (const prospect of prospects) {
      try {
        const existing = await crmRepository.getContactByOutreachProspectId(prospect.id);
        if (existing) { skipped++; continue; }
        await ensureCrmRecords(prospect);
        created++;
      } catch {
        skipped++;
      }
    }

    res.json({ message: `Synced ${created} prospects to CRM, ${skipped} skipped`, created, skipped });
  } catch (err: any) {
    logger.error('[crm] Sync failed', { error: err.message });
    res.status(500).json({ error: 'Sync failed' });
  }
});

export default router;
