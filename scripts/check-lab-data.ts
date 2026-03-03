import { db } from '../server/infra/db/db';
import { fileUploads } from '../shared/schema';
import { eq, isNull, and } from 'drizzle-orm';

(async () => {
  const files = await db.select().from(fileUploads).where(
    and(eq(fileUploads.type, 'lab_report'), isNull(fileUploads.deletedAt))
  );
  for (const f of files) {
    const ld = f.labReportData as any;
    console.log('---');
    console.log('File:', f.id, '|', f.originalFileName);
    console.log('  analysisStatus:', ld?.analysisStatus);
    console.log('  extractedData isArray:', Array.isArray(ld?.extractedData));
    console.log('  extractedData length:', Array.isArray(ld?.extractedData) ? ld.extractedData.length : 'N/A');
    console.log('  markerInsights keys:', ld?.markerInsights ? Object.keys(ld.markerInsights).length : 0);
    console.log('  overallAssessment:', ld?.overallAssessment ? 'present' : 'missing');
  }
  process.exit(0);
})();
