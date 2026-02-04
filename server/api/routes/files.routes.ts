import { Router } from 'express';
import { filesController } from '../controller/files.controller';
import { requireAuth } from '../middleware/middleware';

const router = Router();

router.get('/:fileId/download', requireAuth, filesController.downloadFile);
router.get('/user/:userId/:type', requireAuth, filesController.getUserFiles);
router.post('/upload', requireAuth, filesController.uploadFile);
router.post('/:fileId/reanalyze', requireAuth, filesController.reanalyzeFile);
router.delete('/:fileId', requireAuth, filesController.deleteFile);

export default router;
