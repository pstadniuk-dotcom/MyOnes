export type ClinicalDirection = 'lower_is_better' | 'higher_is_better' | 'balanced_range';

export interface MarkerTrendRule {
    direction: ClinicalDirection;
    keywords: string[];
}

export const LAB_TREND_RULES: MarkerTrendRule[] = [
    {
        direction: 'lower_is_better',
        keywords: [
            // Lipid Panel — standard
            'ldl',
            'ldl p',
            'ldl particle',
            'ldl particle number',
            'ldl small',
            'ldl medium',
            'ldl pattern',
            'apob',
            'triglyceride',
            'non hdl cholesterol',
            'vldl',
            'lp a',
            'lipoprotein a',
            'chol hdl ratio',
            'total cholesterol hdl ratio',
            // Diabetes & Blood Sugar
            'glucose',
            'fasting glucose',
            'insulin',
            'a1c',
            'hba1c',
            'homa',
            // Inflammation
            'crp',
            'hs crp',
            'homocysteine',
            'esr',
            'sed rate',
            'fibrinogen',
            'interleukin',
            // Liver Function
            'alt',
            'ast',
            'alp',
            'ggt',
            // Kidney
            'uric acid',
            'creatinine',
            'bun',
            'urea nitrogen',
            'cystatin c',
            // CBC — elevated counts generally concerning
            'wbc',
            'white blood cell',
            'rdw',
            // Vitamins (excess is bad)
            'ferritin',
            // Cardiac
            'troponin',
            'bnp',
            'nt pro bnp',
            'ck',
            'creatine kinase',
            'ldh',
            // Toxicology
            'lead',
            'mercury',
            'arsenic',
            'cadmium',
            // Prostate
            'psa',
        ]
    },
    {
        direction: 'higher_is_better',
        keywords: [
            // Lipid Panel — higher is better
            'hdl',
            'hdl large',
            'large hdl',
            'ldl large',
            'ldl peak size',
            'ldl particle size',
            // Vitamins & Minerals
            'vitamin d',
            '25 hydroxy',
            'b12',
            'folate',
            'folic acid',
            'iron',
            'zinc',
            'magnesium',
            'selenium',
            'copper',
            'transferrin saturation',
            // Hormones
            'dhea',
            'testosterone',
            'free testosterone',
            'igf',
            // Omega
            'omega 3',
            'omega 3 index',
            'epa',
            'dha',
            // CBC — higher = generally healthier
            'hemoglobin',
            'hematocrit',
            'rbc',
            'red blood cell',
            'platelet',
            // Kidney — higher GFR = better filtration
            'egfr',
            'gfr',
            // Metabolic
            'albumin',
            // Immune
            'complement c3',
            'complement c4',
        ]
    },
    {
        direction: 'balanced_range',
        keywords: [
            // Thyroid
            'tsh',
            't3',
            'free t3',
            't4',
            'free t4',
            // Hormones
            'cortisol',
            'estradiol',
            'progesterone',
            'lh',
            'fsh',
            'shbg',
            'prolactin',
            // CBC differentials
            'neutrophil',
            'lymphocyte',
            'monocyte',
            'eosinophil',
            'basophil',
            'mcv',
            'mch',
            'mchc',
            'mpv',
            // Metabolic electrolytes
            'sodium',
            'potassium',
            'chloride',
            'co2',
            'calcium',
            'phosphorus',
            'bilirubin',
            'globulin',
            // Coagulation
            'pt',
            'inr',
            'aptt',
        ]
    }
];

export const DEFAULT_CLINICAL_DIRECTION: ClinicalDirection = 'balanced_range';
