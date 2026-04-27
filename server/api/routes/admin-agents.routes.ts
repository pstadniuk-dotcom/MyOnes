import { Router } from 'express';
import {
  listAgents,
  getAgentDetail,
  updateAgentSettings,
  triggerAgentRun,
} from '../controller/admin-agents.controller';
import { requireAdmin } from '../middleware/middleware';

const router = Router();

router.get('/', requireAdmin, listAgents);
router.get('/:name', requireAdmin, getAgentDetail);
router.patch('/:name/settings', requireAdmin, updateAgentSettings);
router.post('/:name/run', requireAdmin, triggerAgentRun);

export default router;
