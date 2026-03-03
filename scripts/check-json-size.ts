import '../server/env';
import { db } from '../server/infra/db/db';
import { fileUploads } from '../shared/schema';
import { eq } from 'drizzle-orm';

const [file] = await db.select().from(fileUploads).where(eq(fileUploads.id, 'd7003671-53d2-423e-bcfc-2a8fe76dbb96'));
const data = file.labReportData as any;
console.log('Keys in labReportData:', Object.keys(data));
console.log('analysisStatus:', data.analysisStatus);
console.log('extractedData is array:', Array.isArray(data.extractedData));
console.log('extractedData length:', data?.extractedData?.length);
console.log('overallAssessment present:', !!data.overallAssessment);
console.log('testDate:', data.testDate);
console.log('rawText present:', !!data.rawText);
console.log('rawText length:', data.rawText?.length);
// Check file size - how big is labReportData JSON
const totalSize = JSON.stringify(data).length;
console.log('Total labReportData JSON size:', totalSize, 'bytes (~' + Math.round(totalSize/1024) + 'KB)');
// Check without rawText
const withoutRawText = { ...data };
delete withoutRawText.rawText;
const sizeWithout = JSON.stringify(withoutRawText).length;
console.log('Without rawText:', sizeWithout, 'bytes (~' + Math.round(sizeWithout/1024) + 'KB)');
process.exit(0);
