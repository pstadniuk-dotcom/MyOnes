export type ClinicalDirection = 'lower_is_better' | 'higher_is_better' | 'balanced_range';

export interface MarkerTrendRule {
    direction: ClinicalDirection;
    keywords: string[];
}

export const LAB_TREND_RULES: MarkerTrendRule[] = [
    {
        direction: 'lower_is_better',
        keywords: [
            'ldl',
            'ldl p',
            'ldl particle',
            'apob',
            'triglyceride',
            'glucose',
            'insulin',
            'a1c',
            'hba1c',
            'crp',
            'hs crp',
            'homocysteine',
            'alt',
            'ast',
            'alp',
            'ggt',
            'uric acid',
            'ferritin'
        ]
    },
    {
        direction: 'higher_is_better',
        keywords: [
            'hdl',
            'vitamin d',
            'dhea',
            'testosterone',
            'free testosterone',
            'omega 3',
            'omega 3 index',
            'b12'
        ]
    },
    {
        direction: 'balanced_range',
        keywords: [
            'tsh',
            't3',
            'free t3',
            't4',
            'free t4',
            'cortisol',
            'estradiol',
            'progesterone'
        ]
    }
];

export const DEFAULT_CLINICAL_DIRECTION: ClinicalDirection = 'balanced_range';
