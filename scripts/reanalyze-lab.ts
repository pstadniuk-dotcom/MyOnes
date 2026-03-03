import { db } from '../server/infra/db/db';
import { fileUploads } from '../shared/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { analyzeLabReport } from '../server/utils/fileAnalysis';
import { labsService } from '../server/modules/labs/labs.service';

(async () => {
  // Get the PDF file that shows as "Analyzed" but has no extractedData 
  const [file] = await db.select().from(fileUploads).where(eq(fileUploads.id, 'd7003671-53d2-423e-bcfc-2a8fe76dbb96'));
  
  if (!file) {
    console.log('File not found');
    process.exit(1);
  }

  console.log('Re-analyzing:', file.originalFileName);
  console.log('Object path:', file.objectPath);
  console.log('MIME type:', file.mimeType);

  try {
    // Step 1: Run analysis
    console.log('\n--- Step 1: Running analyzeLabReport ---');
    const labData = await analyzeLabReport(file.objectPath, file.mimeType || 'application/pdf', file.userId);
    
    console.log('Analysis result:');
    console.log('  testDate:', labData.testDate);
    console.log('  testType:', labData.testType);
    console.log('  labName:', labData.labName);
    console.log('  extractedData isArray:', Array.isArray(labData.extractedData));
    console.log('  extractedData length:', labData.extractedData?.length ?? 0);
    console.log('  overallAssessment:', labData.overallAssessment?.substring(0, 100));
    console.log('  riskPatterns count:', labData.riskPatterns?.length ?? 0);

    if (!labData.extractedData || (Array.isArray(labData.extractedData) && labData.extractedData.length === 0)) {
      console.log('\n❌ No markers extracted! Raw text preview:');
      console.log(labData.rawText?.substring(0, 500));
      process.exit(1);
    }

    // Step 2: Generate insights
    console.log('\n--- Step 2: Generating marker insights ---');
    const markerInsights = await labsService.generateAllMarkerInsights(labData.extractedData || []);
    console.log('  Generated insights for', Object.keys(markerInsights).length, 'markers');

    // Step 3: Save to DB
    console.log('\n--- Step 3: Saving to database ---');
    const updatePayload = {
      labReportData: {
        testDate: labData.testDate,
        testType: labData.testType,
        labName: labData.labName,
        physicianName: labData.physicianName,
        overallAssessment: labData.overallAssessment,
        riskPatterns: labData.riskPatterns,
        analysisStatus: 'completed' as const,
        extractedData: labData.extractedData || [],
        markerInsights,
      }
    };
    
    const [updated] = await db.update(fileUploads)
      .set({ labReportData: updatePayload.labReportData })
      .where(eq(fileUploads.id, file.id))
      .returning();
    
    const ldAfter = updated.labReportData as any;
    console.log('\nAfter save:');
    console.log('  analysisStatus:', ldAfter?.analysisStatus);
    console.log('  extractedData isArray:', Array.isArray(ldAfter?.extractedData));
    console.log('  extractedData length:', Array.isArray(ldAfter?.extractedData) ? ldAfter.extractedData.length : 'N/A');
    console.log('  markerInsights keys:', ldAfter?.markerInsights ? Object.keys(ldAfter.markerInsights).length : 0);
    
    console.log('\n✅ Done! Refresh the Labs page.');
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    console.error(err.stack?.substring(0, 500));
  }
  
  process.exit(0);
})();
