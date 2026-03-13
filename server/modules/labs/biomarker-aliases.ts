/**
 * Biomarker Name Alias Map
 *
 * Solves the problem where different lab reports call the same test
 * by different names (e.g. "WBC" vs "White Blood Cell Count").
 * Every alias maps to a single canonical name so that markers
 * from different reports merge into one trend line.
 *
 * Keys are lowercase, stripped to alphanumeric + spaces (matching normalizeKey()).
 * Values are the canonical display name.
 */

const BIOMARKER_ALIASES: Record<string, string> = {
    // ── Complete Blood Count ──
    'wbc':                          'White Blood Cell Count',
    'white blood cells':            'White Blood Cell Count',
    'white blood cell count':       'White Blood Cell Count',
    'white blood cell':             'White Blood Cell Count',
    'leukocytes':                   'White Blood Cell Count',
    'leukocyte count':              'White Blood Cell Count',

    'rbc':                          'Red Blood Cell Count',
    'red blood cells':              'Red Blood Cell Count',
    'red blood cell count':         'Red Blood Cell Count',
    'red blood cell':               'Red Blood Cell Count',
    'erythrocytes':                 'Red Blood Cell Count',
    'erythrocyte count':            'Red Blood Cell Count',

    'hemoglobin':                   'Hemoglobin',
    'hgb':                          'Hemoglobin',
    'hb':                           'Hemoglobin',

    'hematocrit':                   'Hematocrit',
    'hct':                          'Hematocrit',

    'platelets':                    'Platelets',
    'platelet count':               'Platelets',
    'plt':                          'Platelets',
    'thrombocytes':                 'Platelets',

    'mcv':                          'MCV',
    'mean corpuscular volume':      'MCV',

    'mch':                          'MCH',
    'mean corpuscular hemoglobin':  'MCH',

    'mchc':                         'MCHC',
    'mean corpuscular hgb conc':    'MCHC',
    'mean corpuscular hemoglobin concentration': 'MCHC',

    'rdw':                          'RDW',
    'red cell distribution width':  'RDW',
    'rdw cv':                       'RDW',
    'rdw sd':                       'RDW-SD',

    'mpv':                          'MPV',
    'mean platelet volume':         'MPV',

    'neutrophils':                  'Neutrophils',
    'neutrophil':                   'Neutrophils',
    'neutrophils absolute':         'Neutrophils (Absolute)',
    'absolute neutrophils':         'Neutrophils (Absolute)',
    'neutrophils abs':              'Neutrophils (Absolute)',
    'neut abs':                     'Neutrophils (Absolute)',

    'lymphocytes':                  'Lymphocytes',
    'lymphocyte':                   'Lymphocytes',
    'lymphocytes absolute':         'Lymphocytes (Absolute)',
    'absolute lymphocytes':         'Lymphocytes (Absolute)',
    'lymph abs':                    'Lymphocytes (Absolute)',

    'monocytes':                    'Monocytes',
    'monocyte':                     'Monocytes',
    'monocytes absolute':           'Monocytes (Absolute)',
    'absolute monocytes':           'Monocytes (Absolute)',
    'mono abs':                     'Monocytes (Absolute)',

    'eosinophils':                  'Eosinophils',
    'eosinophil':                   'Eosinophils',
    'eosinophils absolute':         'Eosinophils (Absolute)',
    'absolute eosinophils':         'Eosinophils (Absolute)',
    'eos abs':                      'Eosinophils (Absolute)',

    'basophils':                    'Basophils',
    'basophil':                     'Basophils',
    'basophils absolute':           'Basophils (Absolute)',
    'absolute basophils':           'Basophils (Absolute)',
    'baso abs':                     'Basophils (Absolute)',

    // ── Lipid Panel ──
    'total cholesterol':            'Total Cholesterol',
    'cholesterol total':            'Total Cholesterol',
    'cholesterol':                  'Total Cholesterol',
    'chol':                         'Total Cholesterol',

    'ldl':                          'LDL Cholesterol',
    'ldl cholesterol':              'LDL Cholesterol',
    'ldl c':                        'LDL Cholesterol',
    'ldl c direct':                 'LDL Cholesterol',
    'ldl direct':                   'LDL Cholesterol',
    'ldl chol calc':                'LDL Cholesterol',

    'hdl':                          'HDL Cholesterol',
    'hdl cholesterol':              'HDL Cholesterol',
    'hdl c':                        'HDL Cholesterol',

    'triglycerides':                'Triglycerides',
    'triglyceride':                 'Triglycerides',
    'trigs':                        'Triglycerides',
    'tg':                           'Triglycerides',

    'vldl':                         'VLDL Cholesterol',
    'vldl cholesterol':             'VLDL Cholesterol',

    'non hdl cholesterol':          'Non-HDL Cholesterol',
    'non hdl chol':                 'Non-HDL Cholesterol',

    'apob':                         'ApoB',
    'apolipoprotein b':             'ApoB',
    'apo b':                        'ApoB',

    'lp a':                         'Lp(a)',
    'lipoprotein a':                'Lp(a)',
    'lipoprotein little a':         'Lp(a)',

    'chol hdlc ratio':              'Chol/HDL Ratio',
    'tc hdl ratio':                 'Chol/HDL Ratio',
    'cholesterol hdl ratio':        'Chol/HDL Ratio',    'total cholesterol hdl ratio':  'Chol/HDL Ratio',
    'chol hdl ratio':               'Chol/HDL Ratio',

    // ── Advanced NMR Lipid Panel ──
    'ldl particle number':          'LDL Particle Number',
    'ldl p':                        'LDL Particle Number',
    'total ldl particles':          'LDL Particle Number',
    'ldl particles':                'LDL Particle Number',
    'nmr ldl p':                    'LDL Particle Number',

    'ldl small':                    'LDL Small',
    'small ldl':                    'LDL Small',
    'small ldl p':                  'LDL Small',
    'small ldl particles':          'LDL Small',
    'ldl small p':                  'LDL Small',

    'ldl medium':                   'LDL Medium',
    'medium ldl':                   'LDL Medium',
    'medium ldl p':                 'LDL Medium',
    'medium ldl particles':         'LDL Medium',

    'ldl large':                    'LDL Large',
    'large ldl':                    'LDL Large',
    'large ldl p':                  'LDL Large',
    'large ldl particles':          'LDL Large',

    'hdl large':                    'HDL Large',
    'large hdl':                    'HDL Large',
    'large hdl p':                  'HDL Large',
    'large hdl particles':          'HDL Large',
    'hdl large p':                  'HDL Large',

    'ldl pattern':                  'LDL Pattern',
    'ldl size pattern':             'LDL Pattern',
    'lipoprotein pattern':          'LDL Pattern',

    'ldl peak size':                'LDL Peak Size',
    'ldl peak diameter':            'LDL Peak Size',
    'ldl size':                     'LDL Peak Size',
    'mean ldl size':                'LDL Peak Size',
    'ldl particle size':            'LDL Peak Size',

    // ── Inflammation (hs-CRP variants) ──
    'hs crp':                       'hs-CRP',
    'hscrp':                        'hs-CRP',
    'high sensitivity crp':         'hs-CRP',
    'high sensitivity c reactive protein': 'hs-CRP',
    'high sensitivity c-reactive protein': 'hs-CRP',
    'c reactive protein hs':        'hs-CRP',
    'crp high sensitivity':         'hs-CRP',
    'cardiac crp':                  'hs-CRP',
    'crp cardiac':                  'hs-CRP',
    // ── Metabolic Panel ──
    'glucose':                      'Glucose',
    'glucose serum':                'Glucose',
    'blood glucose':                'Glucose',
    'fasting glucose':              'Fasting Glucose',

    'bun':                          'BUN',
    'blood urea nitrogen':          'BUN',
    'urea nitrogen':                'BUN',
    'urea nitrogen bun':            'BUN',
    'urea':                         'BUN',

    'creatinine':                   'Creatinine',
    'creatinine serum':             'Creatinine',

    'egfr':                         'eGFR',
    'estimated gfr':                'eGFR',
    'glomerular filtration rate':   'eGFR',
    'gfr estimated':                'eGFR',
    'egfr non afr american':        'eGFR',
    'egfr if nonafricn am':         'eGFR',
    'egfr if africn am':            'eGFR',

    'sodium':                       'Sodium',
    'na':                           'Sodium',

    'potassium':                    'Potassium',
    'k':                            'Potassium',

    'chloride':                     'Chloride',
    'cl':                           'Chloride',

    'carbon dioxide':               'CO2',
    'co2':                          'CO2',
    'bicarbonate':                  'CO2',
    'co2 total':                    'CO2',

    'calcium':                      'Calcium',
    'calcium serum':                'Calcium',
    'ca':                           'Calcium',

    'total protein':                'Total Protein',
    'protein total':                'Total Protein',

    'albumin':                      'Albumin',
    'albumin serum':                'Albumin',

    'globulin':                     'Globulin',
    'globulin total':               'Globulin',

    'a g ratio':                    'A/G Ratio',
    'albumin globulin ratio':       'A/G Ratio',

    'bilirubin total':              'Bilirubin (Total)',
    'total bilirubin':              'Bilirubin (Total)',
    'bilirubin':                    'Bilirubin (Total)',
    'bilirubin direct':             'Bilirubin (Direct)',
    'direct bilirubin':             'Bilirubin (Direct)',
    'bilirubin indirect':           'Bilirubin (Indirect)',

    // ── Liver Function ──
    'alt':                          'ALT',
    'alanine aminotransferase':     'ALT',
    'sgpt':                         'ALT',
    'alt sgpt':                     'ALT',

    'ast':                          'AST',
    'aspartate aminotransferase':   'AST',
    'sgot':                         'AST',
    'ast sgot':                     'AST',

    'alp':                          'ALP',
    'alkaline phosphatase':         'ALP',
    'alk phos':                     'ALP',

    'ggt':                          'GGT',
    'gamma glutamyl transferase':   'GGT',
    'gamma gt':                     'GGT',
    'gamma glutamyl transpeptidase': 'GGT',

    // ── Thyroid ──
    'tsh':                          'TSH',
    'thyroid stimulating hormone':  'TSH',
    'thyrotropin':                  'TSH',

    't4 free':                      'Free T4',
    'free t4':                      'Free T4',
    'free thyroxine':               'Free T4',
    'ft4':                          'Free T4',

    't3 free':                      'Free T3',
    'free t3':                      'Free T3',
    'free triiodothyronine':        'Free T3',
    'ft3':                          'Free T3',

    't4':                           'T4',
    't4 total':                     'T4',
    'thyroxine':                    'T4',
    'total t4':                     'T4',

    't3':                           'T3',
    't3 total':                     'T3',
    'triiodothyronine':             'T3',
    'total t3':                     'T3',

    't3 uptake':                    'T3 Uptake',

    // ── Vitamins & Minerals ──
    'vitamin d':                    'Vitamin D',
    'vitamin d 25 hydroxy':         'Vitamin D',
    '25 hydroxy vitamin d':         'Vitamin D',
    '25 oh vitamin d':              'Vitamin D',
    'vit d 25 oh':                  'Vitamin D',
    'vitamin d total':              'Vitamin D',
    '25 hydroxyvitamin d':          'Vitamin D',

    'vitamin b12':                  'Vitamin B12',
    'b12':                          'Vitamin B12',
    'cobalamin':                    'Vitamin B12',

    'folate':                       'Folate',
    'folic acid':                   'Folate',
    'folate serum':                 'Folate',

    'iron':                         'Iron',
    'iron serum':                   'Iron',
    'serum iron':                   'Iron',

    'ferritin':                     'Ferritin',
    'ferritin serum':               'Ferritin',

    'tibc':                         'TIBC',
    'total iron binding capacity':  'TIBC',
    'iron binding capacity':        'TIBC',

    'transferrin saturation':       'Transferrin Saturation',
    'iron saturation':              'Transferrin Saturation',
    'saturation':                   'Transferrin Saturation',

    'zinc':                         'Zinc',
    'zinc serum':                   'Zinc',

    'magnesium':                    'Magnesium',
    'magnesium serum':              'Magnesium',
    'mg':                           'Magnesium',

    'selenium':                     'Selenium',
    'selenium serum':               'Selenium',

    'copper':                       'Copper',
    'copper serum':                 'Copper',

    // ── Hormones ──
    'testosterone':                 'Testosterone',
    'testosterone total':           'Testosterone',
    'total testosterone':           'Testosterone',

    'free testosterone':            'Free Testosterone',
    'testosterone free':            'Free Testosterone',

    'estradiol':                    'Estradiol',
    'estradiol e2':                 'Estradiol',
    'e2':                           'Estradiol',

    'dhea':                         'DHEA-S',
    'dhea s':                       'DHEA-S',
    'dhea sulfate':                 'DHEA-S',
    'dehydroepiandrosterone sulfate': 'DHEA-S',

    'cortisol':                     'Cortisol',
    'cortisol am':                  'Cortisol (AM)',
    'cortisol morning':             'Cortisol (AM)',

    'lh':                           'LH',
    'luteinizing hormone':          'LH',

    'fsh':                          'FSH',
    'follicle stimulating hormone': 'FSH',

    'shbg':                         'SHBG',
    'sex hormone binding globulin': 'SHBG',

    'progesterone':                 'Progesterone',

    'prolactin':                    'Prolactin',

    'igf 1':                        'IGF-1',
    'insulin like growth factor':   'IGF-1',
    'igf':                          'IGF-1',

    // ── Inflammation ──
    'crp':                          'CRP',
    'c reactive protein':           'CRP',
    'c reactive protein quantitative': 'hs-CRP',

    'esr':                          'ESR',
    'sed rate':                     'ESR',
    'erythrocyte sedimentation rate': 'ESR',
    'sedimentation rate':           'ESR',

    'homocysteine':                 'Homocysteine',

    'fibrinogen':                   'Fibrinogen',
    'fibrinogen activity':          'Fibrinogen',

    // ── Diabetes ──
    'hemoglobin a1c':               'HbA1c',
    'hba1c':                        'HbA1c',
    'a1c':                          'HbA1c',
    'glycated hemoglobin':          'HbA1c',
    'glycohemoglobin':              'HbA1c',

    'insulin':                      'Insulin',
    'insulin fasting':              'Insulin',
    'fasting insulin':              'Insulin',

    // ── Kidney ──
    'uric acid':                    'Uric Acid',
    'urate':                        'Uric Acid',

    'cystatin c':                   'Cystatin C',

    // ── Cardiac ──
    'bnp':                          'BNP',
    'nt pro bnp':                   'NT-proBNP',
    'nt probnp':                    'NT-proBNP',
    'brain natriuretic peptide':    'BNP',

    'troponin':                     'Troponin',
    'troponin i':                   'Troponin I',
    'troponin t':                   'Troponin T',

    'ck':                           'CK',
    'creatine kinase':              'CK',
    'cpk':                          'CK',

    'ldh':                          'LDH',
    'lactate dehydrogenase':        'LDH',

    // ── Omega & Fatty Acids ──
    'omega 3 index':                'Omega-3 Index',
    'omega 3':                      'Omega-3 Index',
    'epa':                          'EPA',
    'eicosapentaenoic acid':        'EPA',
    'dha':                          'DHA',
    'docosahexaenoic acid':         'DHA',
    'arachidonic acid':             'Arachidonic Acid',
    'omega 6':                      'Omega-6',

    // ── Prostate ──
    'psa':                          'PSA',
    'prostate specific antigen':    'PSA',
    'psa total':                    'PSA',

    // ── Autoimmune ──
    'ana':                          'ANA',
    'antinuclear antibody':         'ANA',
    'antinuclear antibodies':       'ANA',
    'tpo antibodies':               'TPO Antibodies',
    'thyroid peroxidase antibodies': 'TPO Antibodies',
    'thyroid peroxidase ab':        'TPO Antibodies',
    'rheumatoid factor':            'Rheumatoid Factor',
    'rf':                           'Rheumatoid Factor',
};

/**
 * Resolve a raw marker name to its canonical form.
 * Accepts the already-normalized key (lowercase, alphanumeric + spaces).
 * Returns the canonical display name if found, otherwise null.
 */
export function resolveAlias(normalizedKey: string): string | null {
    return BIOMARKER_ALIASES[normalizedKey] ?? null;
}

/**
 * Get the canonical key for a marker name.
 * This normalizes the name and resolves aliases, returning a stable key
 * that can be used to merge markers across reports.
 */
export function canonicalKey(rawName: string): string {
    const key = rawName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const alias = BIOMARKER_ALIASES[key];
    if (alias) {
        return alias.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    }
    return key;
}

/**
 * Get the canonical display name for a marker.
 * Falls back to the original name if no alias is found.
 */
export function canonicalName(rawName: string): string {
    const key = rawName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return BIOMARKER_ALIASES[key] ?? rawName;
}
