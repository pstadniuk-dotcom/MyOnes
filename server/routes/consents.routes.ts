/**
 * Consents Routes Module
 * 
 * Handles all /api/consents/* endpoints:
 * - HIPAA-compliant consent management
 * - Consent granting and retrieval
 */

import { Router } from 'express';
import { userService } from '../domains/users/user.service';
// import { healthService } from '../domains/health/health';
import { requireAuth } from './middleware';
import { logger } from '../infrastructure/logging/logger';
import { healthService } from '../domains/health';

const router = Router();

// Grant user consent for HIPAA-compliant operations
// router.post('/grant', requireAuth, async (req, res) => {
//   try {
//     const userId = req.userId!;
//     const { consentType, consentVersion, consentText } = req.body;

//     // Validate consent type
//     const validConsentTypes = ['lab_data_processing', 'ai_analysis', 'data_retention', 'third_party_sharing'];
//     if (!validConsentTypes.includes(consentType)) {
//       return res.status(400).json({ error: 'Invalid consent type' });
//     }

//     // Get audit information
//     const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress;
//     const userAgent = req.headers['user-agent'];

//     // Create consent record
//     const consent = await healthService.createUserConsent({
//       userId,
//       consentType,
//       granted: true,
//       consentVersion: consentVersion || '1.0',
//       ipAddress,
//       userAgent,
//       consentText: consentText || `User consents to ${consentType}`,
//       metadata: {
//         source: 'upload_form'
//       }
//     });

//     logger.info("HIPAA AUDIT LOG - Consent Granted:", {
//       timestamp: new Date().toISOString(),
//       userId,
//       consentType,
//       ipAddress,
//       userAgent
//     });

//     res.json({ success: true, consent });
//   } catch (error) {
//     logger.error('Consent grant error:', error);
//     res.status(500).json({ error: 'Failed to grant consent' });
//   }
// });

// // Get user's consents
// router.get('/', requireAuth, async (req, res) => {
//   try {
//     const userId = req.userId!;
//     const user = await userService.getUser(userId);
//     const consents = await healthService.getUserConsents(userId);
//     res.json(consents);
//   } catch (error) {
//     logger.error('Error fetching consents:', error);
//     res.status(500).json({ error: 'Failed to fetch consents' });
//   }
// });

export default router;
