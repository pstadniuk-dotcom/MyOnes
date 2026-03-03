import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
import pg from 'pg';
const { Pool } = pg;

const userId = '907ad8a1-7db6-4b6c-8d69-d7fd5ad99454';
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

try {
  // Get all markers from the completed report with 117 markers
  const { rows } = await pool.query(
    `SELECT id, original_file_name,
      lab_report_data->'extractedData' as markers
    FROM file_uploads 
    WHERE user_id = $1 AND type = 'lab_report' AND deleted_at IS NULL
      AND lab_report_data->>'analysisStatus' = 'completed'
    ORDER BY uploaded_at DESC LIMIT 1`,
    [userId]
  );

  if (rows.length === 0) {
    console.log('No completed reports found');
    process.exit(1);
  }

  const markers = rows[0].markers;
  console.log(`Report: ${rows[0].original_file_name}`);
  console.log(`Total markers: ${markers.length}\n`);

  // Show all marker names grouped by what category they'd get
  const CATEGORY_RULES = [
    { category: 'Lipid Panel', keywords: ['cholesterol', 'ldl', 'hdl', 'triglyceride', 'vldl', 'lipoprotein', 'apob', 'apolipoprotein'] },
    { category: 'Complete Blood Count', keywords: ['wbc', 'rbc', 'hemoglobin', 'hematocrit', 'platelet', 'mcv', 'mch', 'mchc', 'rdw', 'mpv', 'neutrophil', 'lymphocyte', 'monocyte', 'eosinophil', 'basophil'] },
    { category: 'Metabolic Panel', keywords: ['glucose', 'bun', 'creatinine', 'egfr', 'sodium', 'potassium', 'chloride', 'carbon dioxide', 'co2', 'calcium', 'protein', 'albumin', 'globulin', 'bilirubin', 'alkaline', 'a/g ratio'] },
    { category: 'Liver Function', keywords: ['alt', 'ast', 'alp', 'ggt', 'gamma', 'bilirubin', 'alkaline phosphatase'] },
    { category: 'Thyroid', keywords: ['tsh', 't3', 't4', 'thyroid', 'free t3', 'free t4', 'thyroxine', 'triiodothyronine'] },
    { category: 'Vitamins & Minerals', keywords: ['vitamin', 'folate', 'folic', 'b12', 'iron', 'ferritin', 'zinc', 'magnesium', 'selenium', 'copper', 'tibc', 'transferrin', 'manganese'] },
    { category: 'Hormones', keywords: ['testosterone', 'estradiol', 'estrogen', 'progesterone', 'dhea', 'cortisol', 'lh', 'fsh', 'prolactin', 'shbg', 'igf', 'growth hormone'] },
    { category: 'Inflammation', keywords: ['crp', 'hs-crp', 'sed rate', 'esr', 'homocysteine', 'fibrinogen', 'interleukin'] },
    { category: 'Diabetes & Blood Sugar', keywords: ['a1c', 'hba1c', 'hemoglobin a1c', 'insulin', 'fasting glucose', 'homa'] },
    { category: 'Kidney Function', keywords: ['gfr', 'creatinine', 'bun', 'uric acid', 'cystatin'] },
    { category: 'Cardiac', keywords: ['bnp', 'troponin', 'ck', 'creatine kinase', 'ldh'] },
    { category: 'Omega & Fatty Acids', keywords: ['omega', 'fatty acid', 'epa', 'dha', 'arachidonic'] },
  ];

  function inferCategory(name) {
    const lower = name.toLowerCase();
    for (const rule of CATEGORY_RULES) {
      if (rule.keywords.some(kw => lower.includes(kw))) {
        return rule.category;
      }
    }
    return 'Other';
  }

  // Group markers by inferred category
  const grouped = {};
  const otherMarkers = [];
  for (const m of markers) {
    const name = m.testName || m.name || '';
    const cat = inferCategory(name);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ name, value: m.value, unit: m.unit, status: m.status });
    if (cat === 'Other') otherMarkers.push(name);
  }

  console.log('=== Category Breakdown ===');
  for (const [cat, items] of Object.entries(grouped).sort((a,b) => a[0].localeCompare(b[0]))) {
    console.log(`\n${cat} (${items.length}):`);
    for (const item of items) {
      console.log(`  ${item.name}: ${item.value} ${item.unit} [${item.status}]`);
    }
  }

  // Specifically check for markers that should be cardiac but aren't
  console.log('\n\n=== Markers that might be cardiac ===');
  for (const m of markers) {
    const name = (m.testName || m.name || '').toLowerCase();
    if (name.includes('omega') || name.includes('cardio') || name.includes('heart') || 
        name.includes('lp(a)') || name.includes('lp-pla') || name.includes('ntprobnp') ||
        name.includes('apo') || name.includes('sdldl') || name.includes('check')) {
      console.log(`  ${m.testName || m.name}: ${m.value} ${m.unit} → currently: ${inferCategory(m.testName || m.name)}`);
    }
  }

} catch (e) {
  console.error('Error:', e.message);
} finally {
  await pool.end();
}
