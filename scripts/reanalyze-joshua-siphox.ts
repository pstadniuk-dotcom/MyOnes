/**
 * Re-analyze Joshua Kresh's Siphox PDF with the new tier-aware prompt rules.
 * Shows BEFORE vs AFTER status diff so we can verify:
 *   - DNR / Did Not Run rows are dropped (was: AST, Free T3 stored as "normal")
 *   - Tiered ranges use widest tier (fair) as abnormal threshold
 *   - rawText is now persisted
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

// Load server/.env
const envPath = path.resolve('server/.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const { db } = await import('../server/infra/db/db');
const { fileUploads } = await import('../shared/schema');
const { eq } = await import('drizzle-orm');
const { analyzeLabReport } = await import('../server/utils/fileAnalysis');

const FILE_ID = 'dee51a9a-edf8-4c8a-9808-5c3b1473308f'; // Joshua's Siphox PDF

const [file] = await db.select().from(fileUploads).where(eq(fileUploads.id, FILE_ID));
if (!file) { console.log('File not found'); process.exit(1); }

console.log('Re-analyzing:', file.originalFileName);
console.log('User:', file.userId, 'Mime:', file.mimeType);

const before = (file.labReportData as any) || {};
const beforeMarkers: any[] = Array.isArray(before.extractedData) ? before.extractedData : [];
console.log(`\n=== BEFORE: ${beforeMarkers.length} markers ===`);
const beforeMap = new Map<string, any>();
for (const m of beforeMarkers) beforeMap.set(String(m.testName).toLowerCase(), m);

console.log('\nRunning analysis (this takes ~60-90s for OCR + structuring)...');
const t0 = Date.now();
const labData = await analyzeLabReport(file.objectPath, file.mimeType || 'application/pdf', file.userId);
console.log(`Done in ${Math.round((Date.now() - t0)/1000)}s`);

const afterMarkers: any[] = Array.isArray(labData.extractedData) ? labData.extractedData : [];
console.log(`\n=== AFTER: ${afterMarkers.length} markers (delta ${afterMarkers.length - beforeMarkers.length}) ===`);
console.log('rawText length:', (labData.rawText || '').length, '(was 0)');
console.log('testDate:', labData.testDate, 'source:', labData.testDateSource);

// Check DNR removal
const dnrBefore = beforeMarkers.filter(m => {
  const v = String(m.value || '').trim().toLowerCase();
  return ['dnr', 'did not run', 'pending', 'n/a', '-', '—', ''].includes(v);
});
const dnrAfter = afterMarkers.filter(m => {
  const v = String(m.value || '').trim().toLowerCase();
  return ['dnr', 'did not run', 'pending', 'n/a', '-', '—', ''].includes(v);
});
console.log(`\nDNR/blank rows: BEFORE=${dnrBefore.length}, AFTER=${dnrAfter.length}`);
if (dnrBefore.length) {
  console.log('  Removed:');
  for (const m of dnrBefore) console.log(`    - ${m.testName} (value="${m.value}", was status="${m.status}")`);
}
if (dnrAfter.length) {
  console.log('  ⚠️ Still present (should be 0):');
  for (const m of dnrAfter) console.log(`    - ${m.testName} (value="${m.value}", status="${m.status}")`);
}

// Status changes - especially HDL (was "low" at 48, ref "fair: >40")
console.log('\n=== STATUS CHANGES (key markers) ===');
const interesting = ['hdl cholesterol', 'egfr', 'sleep efficiency', 'daily steps', 'basal metabolic rate',
  '% hemoglobin a1c', 'estimated average glucose', 'free t3:free t4 ratio', 'apolipoprotein b', 'creatinine',
  'aspartate aminotransferase', 'free triiodothyronine'];
for (const m of afterMarkers) {
  const key = String(m.testName).toLowerCase();
  const matched = interesting.some(i => key.includes(i));
  if (!matched) continue;
  const beforeM = beforeMap.get(key);
  const beforeStatus = beforeM?.status || '(missing)';
  const afterStatus = m.status;
  const tag = beforeStatus === afterStatus ? ' ' : '🔄';
  console.log(`${tag} ${m.testName.padEnd(45)} ${String(m.value).padEnd(10)} | ${beforeStatus.padEnd(8)} → ${afterStatus}`);
}

// Counts by status
const countBy = (arr: any[]) => arr.reduce((acc, m) => { acc[m.status || 'unknown'] = (acc[m.status || 'unknown']||0)+1; return acc; }, {} as Record<string,number>);
console.log('\nStatus counts BEFORE:', countBy(beforeMarkers));
console.log('Status counts AFTER: ', countBy(afterMarkers));

// Save to DB
console.log('\nSaving updated analysis to file_uploads...');
await db.update(fileUploads)
  .set({
    labReportData: {
      ...before,
      testDate: labData.testDate,
      testDateSource: labData.testDateSource,
      testDateConfidence: labData.testDateConfidence,
      testType: labData.testType,
      labName: labData.labName,
      physicianName: labData.physicianName,
      overallAssessment: labData.overallAssessment,
      riskPatterns: labData.riskPatterns,
      analysisStatus: 'completed',
      extractedData: afterMarkers,
      rawText: labData.rawText,
      markerInsights: before.markerInsights, // preserve existing if any
    },
  })
  .where(eq(fileUploads.id, FILE_ID));

console.log('✅ Saved. rawText now persisted (', (labData.rawText||'').length, 'chars)');
process.exit(0);
