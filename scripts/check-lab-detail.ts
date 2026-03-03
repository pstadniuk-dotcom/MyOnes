import { db } from '../server/infra/db/db';
import { fileUploads } from '../shared/schema';
import { eq } from 'drizzle-orm';

(async () => {
  // Check the "Analyzed" file
  const [f] = await db.select().from(fileUploads).where(eq(fileUploads.id, 'd7003671-53d2-423e-bcfc-2a8fe76dbb96'));
  const ld = f.labReportData as any;
  console.log('labReportData keys:', Object.keys(ld || {}));
  console.log('analysisStatus:', ld?.analysisStatus);
  console.log('extractedData:', typeof ld?.extractedData, JSON.stringify(ld?.extractedData)?.substring(0, 200));
  console.log('markerInsights sample:', JSON.stringify(ld?.markerInsights)?.substring(0, 300));
  console.log('testDate:', ld?.testDate);
  console.log('testType:', ld?.testType);
  console.log('labName:', ld?.labName);
  
  // Also check the one with 129 markers
  const [f2] = await db.select().from(fileUploads).where(eq(fileUploads.id, '340746a5-5d80-40a8-973a-e5164d700ba7'));
  const ld2 = f2.labReportData as any;
  console.log('\n--- File with 129 markers ---');
  console.log('labReportData keys:', Object.keys(ld2 || {}));
  console.log('markerInsights:', typeof ld2?.markerInsights, JSON.stringify(ld2?.markerInsights)?.substring(0, 100));

  process.exit(0);
})();
