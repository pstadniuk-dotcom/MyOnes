/**
 * Reset file d7003671 to 'error' status and trigger reanalysis.
 * This script performs the full pipeline: OCR → structure → save.
 */
import '../server/env';
import { db } from '../server/infra/db/db';
import { fileUploads } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { analyzeLabReport } from '../server/utils/fileAnalysis';

const FILE_ID = 'd7003671-53d2-423e-bcfc-2a8fe76dbb96';
const USER_ID = '907ad8a1-7db6-4b6c-8d69-d7fd5ad99454';

async function main() {
  try {
    // Step 1: Get file info
    const [file] = await db.select().from(fileUploads).where(eq(fileUploads.id, FILE_ID));
    if (!file) { console.error('File not found'); process.exit(1); }
    
    console.log(`File: ${file.fileName}`);
    console.log(`ObjectPath: ${file.objectPath}`);
    console.log(`MimeType: ${file.mimeType}`);
    console.log(`Current status: ${(file.labReportData as any)?.analysisStatus}`);

    // Step 2: Set status to processing
    await db.update(fileUploads).set({
      labReportData: { analysisStatus: 'processing' }
    }).where(eq(fileUploads.id, FILE_ID));
    console.log('\n--- Step 1: Analyzing lab report (OCR + structure) ---');

    const labData = await analyzeLabReport(
      file.objectPath,
      file.mimeType || 'application/pdf',
      USER_ID
    );

    console.log(`\nExtracted markers: ${labData?.extractedData?.length || 0}`);
    console.log(`Test date: ${labData?.testDate}`);
    console.log(`Lab name: ${labData?.labName}`);
    console.log(`Overall assessment: ${labData?.overallAssessment?.substring(0, 100)}...`);

    if (!labData?.extractedData?.length) {
      console.error('No markers extracted! Saving as error.');
      await db.update(fileUploads).set({
        labReportData: { ...labData, analysisStatus: 'error' }
      }).where(eq(fileUploads.id, FILE_ID));
      process.exit(1);
    }

    // Step 3: Save the analyzed data (skip insights for now to avoid OOM)
    console.log('\n--- Step 2: Saving to database ---');
    await db.update(fileUploads).set({
      labReportData: {
        ...labData,
        analysisStatus: 'completed',
        markerInsights: {}
      }
    }).where(eq(fileUploads.id, FILE_ID));
    
    console.log(`\n✅ Done! Saved ${labData.extractedData.length} markers with status 'completed'.`);
    console.log('Marker insights can be generated separately later.');

    // Verify
    const [verify] = await db.select().from(fileUploads).where(eq(fileUploads.id, FILE_ID));
    const vData = verify.labReportData as any;
    console.log(`\nVerification:`);
    console.log(`  analysisStatus: ${vData?.analysisStatus}`);
    console.log(`  extractedData count: ${Array.isArray(vData?.extractedData) ? vData.extractedData.length : 'N/A'}`);
    console.log(`  overallAssessment: ${vData?.overallAssessment ? 'present' : 'missing'}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
