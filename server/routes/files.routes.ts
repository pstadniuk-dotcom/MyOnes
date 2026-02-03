/**
 * Files Routes Module
 * 
 * Handles all /api/files/* endpoints:
 * - File uploads (HIPAA-compliant)
 * - File downloads
 * - File listing
 * - File deletion
 * - Lab report analysis
 */

import { Router } from 'express';
// import { filesService } from '../domains/health/index';
import { requireAuth } from './middleware';
import { ObjectStorageService } from '../objectStorage';
import { analyzeLabReport } from '../fileAnalysis';
import { logger } from '../infrastructure/logging/logger';
import { filesService } from 'server/domains/files';

const router = Router();

// Download file
router.get('/:fileId/download', requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { fileId } = req.params;
  try {
    const fileUpload = await filesService.getFileUpload(fileId);
    if (!fileUpload) {
      return res.status(404).json({ error: 'File not found' });
    }
    if (fileUpload.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    // Download file from Supabase storage
    const objectPath = fileUpload.objectPath;
    const buffer = await ObjectStorageService.prototype.getLabReportFile(objectPath, userId);
    if (!buffer) {
      return res.status(500).json({ error: 'Failed to download file' });
    }
    res.setHeader('Content-Type', fileUpload.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileUpload.originalFileName}"`);
    res.send(buffer);
  } catch (error) {
    logger.error('File download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Get user's uploaded files by type
router.get('/user/:userId/:type', requireAuth, async (req, res) => {
  const { userId, type } = req.params;
  const requestingUserId = req.userId!;

  // Users can only access their own files
  if (userId !== requestingUserId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const fileType = type === 'lab-reports' ? 'lab_report' : undefined;
    const files = await filesService.listFileUploadsByUser(userId, fileType, false);
    res.json(files);
  } catch (error) {
    logger.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// HIPAA-compliant file upload endpoint with full audit logging
router.post('/upload', requireAuth, async (req, res) => {
  const userId = req.userId!;
  const auditInfo = {
    ipAddress: req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
    userAgent: req.headers['user-agent']
  };

  try {
    // Check if file was uploaded
    if (!req.files || !req.files.file) {
      logger.warn("HIPAA AUDIT LOG - Failed Upload Attempt:", {
        timestamp: new Date().toISOString(),
        userId,
        action: 'write',
        objectPath: 'upload-attempt',
        ipAddress: auditInfo.ipAddress,
        userAgent: auditInfo.userAgent,
        success: false,
        reason: 'No file uploaded'
      });
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadedFile = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;

    // File validation with HIPAA audit logging
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB limit
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.txt', '.doc', '.docx'];

    if (uploadedFile.size > maxSizeBytes) {
      logger.warn("HIPAA AUDIT LOG - File Too Large:", {
        timestamp: new Date().toISOString(),
        userId,
        action: 'write',
        objectPath: uploadedFile.name,
        ipAddress: auditInfo.ipAddress,
        userAgent: auditInfo.userAgent,
        success: false,
        reason: `File too large: ${uploadedFile.size} bytes (max: ${maxSizeBytes})`
      });
      return res.status(400).json({
        error: 'File too large. Maximum size is 10MB.'
      });
    }

    if (!allowedMimeTypes.includes(uploadedFile.mimetype)) {
      logger.warn("HIPAA AUDIT LOG - Invalid File Type:", {
        timestamp: new Date().toISOString(),
        userId,
        action: 'write',
        objectPath: uploadedFile.name,
        ipAddress: auditInfo.ipAddress,
        userAgent: auditInfo.userAgent,
        success: false,
        reason: `Invalid MIME type: ${uploadedFile.mimetype}`
      });
      return res.status(400).json({
        error: 'Invalid file type. Only PDF, JPG, PNG, TXT, DOC, and DOCX files are allowed.'
      });
    }

    const fileName = uploadedFile.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    if (!hasValidExtension) {
      logger.warn("HIPAA AUDIT LOG - Invalid File Extension:", {
        timestamp: new Date().toISOString(),
        userId,
        action: 'write',
        objectPath: uploadedFile.name,
        ipAddress: auditInfo.ipAddress,
        userAgent: auditInfo.userAgent,
        success: false,
        reason: `Invalid file extension for: ${fileName}`
      });
      return res.status(400).json({
        error: 'Invalid file extension. Only .pdf, .jpg, .jpeg, .png, .txt, .doc, and .docx files are allowed.'
      });
    }

    // Determine file type category for HIPAA compliance
    let fileType: 'lab_report' | 'medical_document' | 'prescription' | 'other' = 'other';
    const labKeywords = ['lab', 'blood', 'test', 'cbc', 'panel', 'result', 'report', 'analysis', 'metabolic', 'lipid', 'thyroid', 'vitamin', 'serum', 'urine', 'specimen'];
    const fileNameLower = fileName.toLowerCase();

    if (labKeywords.some(keyword => fileNameLower.includes(keyword))) {
      fileType = 'lab_report';
    } else if (fileName.includes('prescription') || fileName.includes('rx')) {
      fileType = 'prescription';
    } else if (allowedMimeTypes.slice(0, 4).includes(uploadedFile.mimetype)) {
      fileType = 'medical_document';
    }

    // Use HIPAA-compliant ObjectStorageService for secure upload
    const objectStorageService = new ObjectStorageService();

    // Upload directly to Supabase
    const normalizedPath = await objectStorageService.uploadLabReportFile(
      userId,
      uploadedFile.data,
      uploadedFile.name,
      uploadedFile.mimetype
    );

    // Save file metadata to storage with HIPAA compliance fields
    const fileUpload = await filesService.createFileUpload({
      userId,
      type: fileType,
      objectPath: normalizedPath,
      originalFileName: uploadedFile.name,
      fileSize: uploadedFile.size,
      mimeType: uploadedFile.mimetype,
      hipaaCompliant: true,
      encryptedAtRest: true,
      retentionPolicyId: '7_years' // Default 7-year retention for medical records
    });

    // Analyze lab reports automatically (PDF and images only - text files analyzed in background)
    let labDataExtraction = null;
    if (fileType === 'lab_report' && (uploadedFile.mimetype === 'application/pdf' || uploadedFile.mimetype.startsWith('image/'))) {
      try {
        logger.info(`✨ Analyzing lab report: ${uploadedFile.name} (${uploadedFile.mimetype})`);
        labDataExtraction = await analyzeLabReport(normalizedPath, uploadedFile.mimetype, userId);

        // Update file upload with extracted lab data
        if (labDataExtraction && fileUpload.id) {
          await filesService.updateFileUpload(fileUpload.id, {
            labReportData: {
              testDate: labDataExtraction.testDate,
              testType: labDataExtraction.testType,
              labName: labDataExtraction.labName,
              physicianName: labDataExtraction.physicianName,
              analysisStatus: 'completed',
              extractedData: labDataExtraction.extractedData || []
            }
          });
          logger.info(`Lab data extracted successfully from ${uploadedFile.name}`);
        }
      } catch (error) {
        logger.error('Lab report analysis failed:', error);
        // Update status to error but don't fail the upload
        if (fileUpload.id) {
          await filesService.updateFileUpload(fileUpload.id, {
            labReportData: {
              analysisStatus: 'error'
            }
          });
        }
      }
    } else if (fileType === 'lab_report' && uploadedFile.mimetype === 'text/plain') {
      // For text files, analyze in background to avoid timeout
      logger.info(`📝 Queuing background analysis for text file: ${uploadedFile.name}`);
      // Fire-and-forget background analysis
      analyzeLabReport(normalizedPath, uploadedFile.mimetype, userId)
        .then(async (extraction) => {
          if (extraction && fileUpload.id) {
            await filesService.updateFileUpload(fileUpload.id, {
              labReportData: {
                testDate: extraction.testDate,
                testType: extraction.testType,
                labName: extraction.labName,
                physicianName: extraction.physicianName,
                analysisStatus: 'completed',
                extractedData: extraction.extractedData || []
              }
            });
            logger.info(`✅ Background analysis completed for ${uploadedFile.name}`);
          }
        })
        .catch(async (error) => {
          logger.error('Background lab report analysis failed:', error);
          if (fileUpload.id) {
            await filesService.updateFileUpload(fileUpload.id, {
              labReportData: {
                analysisStatus: 'error'
              }
            });
          }
        });
    }

    // Log successful upload
    logger.info("HIPAA AUDIT LOG - Successful Upload:", {
      timestamp: new Date().toISOString(),
      userId,
      action: 'write',
      objectPath: normalizedPath,
      ipAddress: auditInfo.ipAddress,
      userAgent: auditInfo.userAgent,
      success: true,
      reason: `Successfully uploaded ${fileType}: ${uploadedFile.name}`
    });

    // Return file metadata with lab data if extracted
    const responseData = {
      id: fileUpload.id,
      name: uploadedFile.name,
      url: normalizedPath,
      type: fileUpload.type,
      size: uploadedFile.size,
      uploadedAt: fileUpload.uploadedAt,
      hipaaCompliant: true,
      labData: labDataExtraction
    };

    res.json(responseData);

  } catch (error) {
    // Log failed upload with full error details
    logger.error("HIPAA AUDIT LOG - Upload Error:", {
      timestamp: new Date().toISOString(),
      userId,
      action: 'write',
      objectPath: 'upload-error',
      ipAddress: auditInfo.ipAddress,
      userAgent: auditInfo.userAgent,
      success: false,
      reason: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof Error && error.name === 'ConsentRequiredError') {
      return res.status(403).json({
        error: 'User consent required for file upload',
        details: error.message
      });
    }

    logger.error('File upload error:', error);
    res.status(500).json({
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Re-trigger analysis on existing lab report
router.post('/:fileId/reanalyze', requireAuth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.userId!;

    // Get the file upload record
    const fileUpload = await filesService.getFileUpload(fileId);

    if (!fileUpload) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (fileUpload.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (fileUpload.type !== 'lab_report') {
      return res.status(400).json({ error: 'Only lab reports can be re-analyzed' });
    }

    logger.info('🔄 Re-analyzing lab report:', fileId, fileUpload.originalFileName);

    // Trigger analysis
    const labData = await analyzeLabReport(
      fileUpload.objectPath,
      fileUpload.mimeType || 'text/plain',
      userId
    );

    // Update the file upload with analyzed data
    await filesService.updateFileUpload(fileId, {
      labReportData: {
        ...labData,
        analysisStatus: 'completed'
      }
    });

    logger.info('✅ Re-analysis complete for:', fileId);

    res.json({
      success: true,
      message: 'Lab report re-analyzed successfully',
      data: labData
    });
  } catch (error) {
    logger.error('Re-analysis error:', error);
    res.status(500).json({
      error: 'Failed to re-analyze lab report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete file with audit logging
router.delete('/:fileId', requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { fileId } = req.params;
  try {
    // Verify file belongs to user
    const fileUpload = await filesService.getFileUpload(fileId);
    if (!fileUpload) {
      return res.status(404).json({ error: 'File not found' });
    }
    if (fileUpload.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    // Hard delete from Supabase storage
    const objectPath = fileUpload.objectPath;
    const deletedFromStorage = await ObjectStorageService.prototype.secureDeleteLabReport(objectPath, userId);
    // Soft delete in DB
    const deleted = await filesService.softDeleteFileUpload(fileId, userId);
    if (!deleted || !deletedFromStorage) {
      throw new Error('Failed to delete file');
    }
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    logger.error('File delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
