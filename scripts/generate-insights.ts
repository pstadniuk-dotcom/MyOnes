/**
 * Generate marker insights for lab report files.
 * Processes and saves each file independently to avoid losing progress.
 */
import '../server/env';
import { db } from '../server/infra/db/db';
import { fileUploads } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { labsService } from '../server/modules/labs/labs.service';

const FILE_IDS = [
  'd7003671-53d2-423e-bcfc-2a8fe76dbb96',
  '340746a5-5d80-40a8-973a-e5164d700ba7',
];

async function processFile(fileId: string) {
  const [file] = await db.select().from(fileUploads).where(eq(fileUploads.id, fileId));
  if (!file) { console.log(`File ${fileId} not found, skipping`); return; }

  const data = file.labReportData as any;
  console.log(`\n--- ${file.originalFileName} ---`);
  console.log(`Status: ${data.analysisStatus}`);
  console.log(`Markers: ${data.extractedData?.length || 0}`);
  console.log(`Current insights: ${Object.keys(data.markerInsights || {}).length}`);

  if (Object.keys(data.markerInsights || {}).length > 0) {
    console.log('Already has insights, skipping.');
    return;
  }

  if (!Array.isArray(data.extractedData) || data.extractedData.length === 0) {
    console.log('No extracted data, skipping');
    return;
  }

  console.log('Generating marker insights via GPT-4o-mini...');
  const insights = await labsService.generateAllMarkerInsights(data.extractedData);
  console.log(`Generated ${Object.keys(insights).length} insights`);

  if (Object.keys(insights).length > 0) {
    await db.update(fileUploads).set({
      labReportData: { ...data, markerInsights: insights }
    }).where(eq(fileUploads.id, fileId));
    console.log(`✅ Saved ${Object.keys(insights).length} insights for ${fileId}`);
  } else {
    console.log('⚠️ No insights generated');
  }
}

async function main() {
  for (const fileId of FILE_IDS) {
    try {
      await processFile(fileId);
    } catch (err) {
      console.error(`Error processing ${fileId}:`, err);
    }
  }

  // Verify
  for (const fileId of FILE_IDS) {
    const [v] = await db.select().from(fileUploads).where(eq(fileUploads.id, fileId));
    if (v) {
      const vd = v.labReportData as any;
      console.log(`\n${v.originalFileName}: ${Object.keys(vd.markerInsights || {}).length} insights saved`);
    }
  }

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
