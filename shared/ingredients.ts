// Shared ingredient catalog - available to both frontend and backend

export interface IngredientInfo {
  name: string;
  doseMg: number; // Default/standard dose
  doseRangeMin?: number; // Minimum allowed dose (for AI flexibility)
  doseRangeMax?: number; // Maximum allowed dose (for AI flexibility)
  category: 'base' | 'individual';
  type?: string; // Use case categories (e.g., "Hormonal Support, Antioxidant")
  description?: string; // Helpful description for user selection
  suggestedUse?: string; // When/how to use this ingredient
  benefits?: string[]; // Health benefits of this ingredient
}

export interface SubIngredient {
  name: string;
  amount: string; // e.g., "20mg", "75 IU", "250mcg"
  description?: string;
  benefits?: string[];
}

export interface SystemSupportDetails {
  name: string;
  doseMg: number;
  systemSupported: string;
  activeIngredients: SubIngredient[];
  suggestedDosage: string;
  description: string;
}

// ============================================================================
// SYSTEM SUPPORTS (18 total) - FIXED dosages, cannot be adjusted
// ============================================================================

export const SYSTEM_SUPPORTS: IngredientInfo[] = [
  {
    name: 'Adrenal Support',
    doseMg: 420,
    doseRangeMin: 420,
    doseRangeMax: 1260,
    category: 'base',
    description: 'Supports adrenal gland function and stress response. This complex of vitamins and herbs may help to alleviate signs of Adrenal Fatigue.',
  },
  {
    name: 'Beta Max',
    doseMg: 650,
    doseRangeMin: 650,
    doseRangeMax: 1950,
    category: 'base',
    description: 'Supports liver, gallbladder, and pancreas. Helps regulate multiple hepatic functions such as lipid and carbohydrate metabolism and proper liver functions.',
  },
  {
    name: 'C Boost',
    doseMg: 598,
    doseRangeMin: 598,
    doseRangeMax: 1794,
    category: 'base',
    description: 'Vitamin C and bioflavonoids blend with antioxidant and anti-inflammatory properties. Supports soft tissue health.',
  },
  {
    name: 'Endocrine Support',
    doseMg: 335,
    doseRangeMin: 335,
    doseRangeMax: 1005,
    category: 'base',
    description: 'Supports endocrine system and pancreatic health. Helps utilize vitamins, improve energy production and ensure proper liver function.',
  },
  {
    name: 'Heart Support',
    doseMg: 689,
    doseRangeMin: 689,
    doseRangeMax: 2067,
    category: 'base',
    description: 'Supports heart function with magnesium, l-carnitine and l-taurine. Aids in blood pressure, nervous system, heart failure, oxidative stress, and myocardial contractions.',
  },
  {
    name: 'Histamine Support',
    doseMg: 200,
    doseRangeMin: 200,
    doseRangeMax: 600,
    category: 'base',
    description: 'Supports immune system and normal levels of histamine. Helps stabilize mast cell membranes and reduce histamine reactions.',
  },
  {
    name: 'Immune-C',
    doseMg: 358,
    doseRangeMin: 358,
    doseRangeMax: 1074,
    category: 'base',
    description: 'Supports immune system health with Graviola, vitamin C, Camu Camu berry, Cats Claw, and Astragalus.',
  },
  {
    name: 'Kidney & Bladder Support',
    doseMg: 565,
    doseRangeMin: 565,
    doseRangeMax: 1695,
    category: 'base',
    description: 'Supports kidney and bladder function. May improve blood pressure and blood sugar; helps flush kidney stones and stop inflammatory diseases of the urinary tract.',
  },
  {
    name: 'Ligament Support',
    doseMg: 130,
    doseRangeMin: 130,
    doseRangeMax: 390,
    category: 'base',
    description: 'Supports muscles and connective tissue. Helps improve stiffness, inflammation, arthritis, joint support, and soreness.',
  },
  {
    name: 'Liver Support',
    doseMg: 530,
    doseRangeMin: 530,
    doseRangeMax: 1590,
    category: 'base',
    description: 'Supports liver health. Helps reduce fatty necrosis, reduce stress on liver, support bile production, and improve liver function.',
  },
  {
    name: 'Lung Support',
    doseMg: 242,
    doseRangeMin: 242,
    doseRangeMax: 726,
    category: 'base',
    description: 'Supports lung and immune system health. Combination of vitamins and antioxidants support lungs, lymph nodes and thymus.',
  },
  {
    name: 'MG/K',
    doseMg: 90,
    doseRangeMin: 90,
    doseRangeMax: 270,
    category: 'base',
    description: 'Magnesium Complex - concentrated blend of seven forms of magnesium bound in potassium. Supports autonomic nervous system, adrenal glands, muscles, blood sugar, bone and DNA.',
  },
  {
    name: 'Mold RX',
    doseMg: 525,
    doseRangeMin: 525,
    doseRangeMax: 1575,
    category: 'base',
    description: 'Detoxification of molds. Oregano, Chaga, Sage produce powerful antifungal, antibacterial and anti-inflammatory effects against mold.',
  },
  {
    name: 'Ovary Uterus Support',
    doseMg: 253,
    doseRangeMin: 253,
    doseRangeMax: 759,
    category: 'base',
    description: 'Supports female reproductive system health. Helps regulate women\'s cycles, alleviate muscle spasms and may reduce risk for certain cancers.',
  },
  {
    name: 'Para X',
    doseMg: 523,
    doseRangeMin: 523,
    doseRangeMax: 1569,
    category: 'base',
    description: 'Supports intestinal health when exposed to parasites. Black walnut and wormwood treat parasitic worm infections naturally.',
  },
  {
    name: 'Prostate Support',
    doseMg: 202,
    doseRangeMin: 202,
    doseRangeMax: 606,
    category: 'base',
    description: 'Supports general prostate health. Encourages anti-inflammation and proper function.',
  },
  {
    name: 'Spleen Support',
    doseMg: 203,
    doseRangeMin: 203,
    doseRangeMax: 609,
    category: 'base',
    description: 'Supports spleen and lymphatic system health. Dandelion and nettle help the endocrine system including the spleen.',
  },
  {
    name: 'Thyroid Support',
    doseMg: 291,
    doseRangeMin: 291,
    doseRangeMax: 873,
    category: 'base',
    description: 'Supports thyroid health. Provides necessary nutrients for proper thyroid function. Combines iodine and glandular concentrates.',
  },
];

// ============================================================================
// INDIVIDUAL INGREDIENTS (33 total) - ADJUSTABLE within dose ranges
// ============================================================================

export const INDIVIDUAL_INGREDIENTS: IngredientInfo[] = [
  {
    name: 'Aloe Vera',
    doseMg: 50,
    doseRangeMin: 50,
    doseRangeMax: 250,
    category: 'individual',
    type: 'Antioxidant, Digestive Health, Anti-inflammatory',
    suggestedUse: 'May support digestive health, help manage blood sugar levels, and provide antioxidant and anti-inflammatory benefits.',
    benefits: [
      'Known for antibacterial and antioxidant properties',
      'May help relieve symptoms associated with diabetes by lowering blood sugar',
      'Supports skin health and gastrointestinal movement',
      'May aid in managing inflammatory conditions within digestive system'
    ]
  },
  {
    name: 'Ashwagandha',
    doseMg: 50,
    doseRangeMin: 50,
    doseRangeMax: 600,
    category: 'individual',
    type: 'Stress Relief, Antioxidant, Anti-inflammatory',
    suggestedUse: 'May support stress relief, help manage anxiety levels, and offer antioxidant and anti-inflammatory benefits.',
    benefits: [
      'Commonly used to help alleviate anxiety and stress',
      'Provides anti-inflammatory and antioxidant effects',
      'Could support blood sugar regulation',
      'May improve respiratory health'
    ]
  },
  {
    name: 'Astragalus',
    doseMg: 50,
    doseRangeMin: 50,
    doseRangeMax: 50,
    category: 'individual',
    type: 'Immune Support, Antioxidant, Organ Health',
    suggestedUse: 'May support immune function, help manage blood sugar levels, and provide antioxidant protection. Could assist in promoting heart, kidney, and liver health.',
    benefits: [
      'Commonly used to protect and support immune system through antioxidant properties',
      'May help improve heart, kidney, and liver function',
      'Widely used to assist in controlling blood sugar levels'
    ]
  },
  {
    name: 'Blackcurrant Extract',
    doseMg: 60,
    doseRangeMin: 60,
    doseRangeMax: 500,
    category: 'individual',
    type: 'Immune Support, Heart Health, Anti-inflammatory',
    suggestedUse: 'May support immune system, help improve blood flow to heart, and provide anti-inflammatory benefits.',
    benefits: [
      'Rich in anti-inflammatory, antiviral, antiseptic, antimicrobial, and antitoxic properties',
      'May boost immune system function and protect against heart disease',
      'Omega fats and flavonoids may improve blood flow to heart and support cardiovascular health'
    ]
  },
  {
    name: 'Broccoli Concentrate',
    doseMg: 50,
    doseRangeMin: 50,
    doseRangeMax: 500,
    category: 'individual',
    type: 'Antioxidant & Detox Support',
    suggestedUse: 'Provides concentrated sulforaphane that activates detoxification pathways and supports cellular health. Used for antioxidant and hormone-balancing effects.',
    benefits: [
      'Rich in sulforaphane - supports natural detoxification processes',
      'Helps balance estrogen levels',
      'Promotes cellular protection',
      'May contribute to overall immune resilience and long-term health'
    ]
  },
  {
    name: 'Camu Camu',
    doseMg: 25,
    doseRangeMin: 25,
    doseRangeMax: 2500,
    category: 'individual',
    type: 'Immune Support, Anti-inflammatory, Blood Sugar Support',
    suggestedUse: 'May help fight inflammation, improve blood sugar levels, and support overall immune function.',
    benefits: [
      'Rich in ascorbic acid (vitamin C)',
      'Often used to combat viral infections',
      'May support weight loss by controlling blood sugar levels',
      'Helps reduce inflammation'
    ]
  },
  {
    name: 'Cats Claw',
    doseMg: 50,
    doseRangeMin: 50,
    doseRangeMax: 50,
    category: 'individual',
    type: 'Immune Support, Anti-inflammatory, Antibacterial',
    suggestedUse: 'May support immune health, relieve inflammation, and fight off infections.',
    benefits: [
      'Commonly used for anti-inflammatory properties, especially for arthritis and GI inflammation',
      'Exhibits antibacterial, antifungal, and antiviral properties',
      'Useful in helping body fight off persistent infections'
    ]
  },
  {
    name: 'Chaga',
    doseMg: 350,
    doseRangeMin: 350,
    doseRangeMax: 2000,
    category: 'individual',
    type: 'Antioxidant, Blood Sugar Support, Anti-inflammatory',
    suggestedUse: 'May help support healthy blood sugar levels, lower cholesterol, and manage blood pressure.',
    benefits: [
      'Commonly used for antioxidant and anti-inflammatory properties',
      'May help lower blood sugar and cholesterol levels',
      'Supports healthy blood pressure',
      'Often used in managing arthritis symptoms',
      'May play role in slowing progression of cancer cells'
    ]
  },
  {
    name: 'Curcumin',
    doseMg: 30,
    doseRangeMin: 30,
    doseRangeMax: 600,
    category: 'individual',
    type: 'Anti-inflammatory, Antioxidant',
    suggestedUse: 'Powerful anti-inflammatory and antioxidant compound from turmeric. Supports joint health, brain function, and cardiovascular health.',
    benefits: [
      'Potent anti-inflammatory effects',
      'Strong antioxidant properties',
      'May improve brain function',
      'Supports joint health',
      'May reduce risk of heart disease'
    ]
  },
  {
    name: 'Cinnamon 20:1',
    doseMg: 30,
    doseRangeMin: 30,
    doseRangeMax: 1000,
    category: 'individual',
    type: 'Antioxidant, Anti-inflammatory, Blood Sugar Support',
    suggestedUse: 'May help lower blood sugar levels and improve insulin sensitivity. May offer support for heart health and act as powerful antioxidant.',
    benefits: [
      'Well-known for antioxidant properties',
      'Supports blood sugar regulation',
      'May reduce risk of heart disease',
      'Improves insulin sensitivity',
      'Anti-inflammatory effects may help lower risk of neurodegenerative diseases'
    ]
  },
  {
    name: 'CoEnzyme Q10',
    doseMg: 20,
    doseRangeMin: 20,
    doseRangeMax: 200,
    category: 'individual',
    type: 'Heart Health, Antioxidant',
    suggestedUse: 'May support heart health, improve exercise performance, and assist with migraines. Believed to reduce oxidative damage and may play role in cancer prevention.',
    benefits: [
      'Potential to improve heart health',
      'May enhance exercise performance',
      'Helps reduce frequency and intensity of migraines',
      'Antioxidant properties protect against oxidative damage',
      'Supports overall cellular health'
    ]
  },
  {
    name: 'Colostrum Powder',
    doseMg: 100,
    doseRangeMin: 100,
    doseRangeMax: 1000,
    category: 'individual',
    type: 'Immune Support, Gut Health',
    suggestedUse: 'May support immune system function and improve gut health. Rich in immunoglobulin G (IgG), powerful antibody that enhances immune response.',
    benefits: [
      'High in IgG antibody that supports immune system',
      'Shown to help with gut health',
      'Potentially improves body\'s ability to repair tissue',
      'Supports growth factors'
    ]
  },
  {
    name: 'GABA',
    doseMg: 50,
    doseRangeMin: 50,
    doseRangeMax: 300,
    category: 'individual',
    type: 'Stress Management, Mood Support, Sleep',
    suggestedUse: 'May support relaxation, mood regulation, and muscle tone while helping stabilize blood pressure. Explored for calming effects on anxiety and sleep support.',
    benefits: [
      'Naturally occurring amino acid that promotes sleep',
      'Helps alleviate anxiety and protect brain',
      'Produces calming effect',
      'May help reduce symptoms of PMS and ADHD',
      'Supports lean muscle growth',
      'May aid in stabilizing blood pressure and relieving pain'
    ]
  },
  {
    name: 'Garlic',
    doseMg: 50,
    doseRangeMin: 50,
    doseRangeMax: 200,
    category: 'individual',
    type: 'Antioxidant, Digestive Health, Anti-inflammatory',
    suggestedUse: 'Supports cardiovascular health and immune function.',
    benefits: [
      'Known to help regulate blood pressure',
      'May lower cholesterol levels',
      'Improves immune system',
      'May reduce risk of certain cancers',
      'Aids in digestion',
      'Nutrient rich with many beneficial bioactive compounds'
    ]
  },
  {
    name: 'Ginger Root',
    doseMg: 75,
    doseRangeMin: 75,
    doseRangeMax: 500,
    category: 'individual',
    type: 'Digestive Support, Anti-inflammatory, Blood Sugar Support',
    suggestedUse: 'May support digestive health, aid in weight loss, and help maintain healthy cholesterol and insulin levels.',
    benefits: [
      'Widely known for anti-nausea properties',
      'May help with digestion',
      'Supports weight loss',
      'Exhibits antibacterial and anti-inflammatory effects',
      'Shown to help slow growth of some cancers',
      'Supports healthy insulin and cholesterol levels'
    ]
  },
  {
    name: 'Ginkgo Biloba Extract 24%',
    doseMg: 40,
    doseRangeMin: 40,
    doseRangeMax: 240,
    category: 'individual',
    type: 'Cognitive Support, Circulation, Antioxidant',
    suggestedUse: 'May support brain health, improve cognitive function, and promote healthy circulation.',
    benefits: [
      'May improve memory and cognitive function',
      'Supports healthy blood circulation',
      'Antioxidant properties',
      'May reduce anxiety',
      'Supports eye health'
    ]
  },
  {
    name: 'Graviola',
    doseMg: 50,
    doseRangeMin: 50,
    doseRangeMax: 1500,
    category: 'individual',
    type: 'Antioxidant, Anti-inflammatory, Immune Support',
    suggestedUse: 'May support antioxidant activity, help maintain healthy blood sugar and blood pressure levels, and promote overall immune health.',
    benefits: [
      'Rich in antioxidants that may help prevent and fight cancer',
      'May kill certain cancer cells',
      'Helps reduce inflammation',
      'Fights off bacteria',
      'Studied for potential to improve stomach ailments',
      'Supports immune system',
      'May aid in treating parasitic infections and hypertension'
    ]
  },
  {
    name: 'Hawthorn Berry',
    doseMg: 50,
    doseRangeMin: 50,
    doseRangeMax: 100,
    category: 'individual',
    type: 'Heart Health, Circulation',
    suggestedUse: 'Supports cardiovascular health by enhancing blood flow and reducing symptoms of heart disease, high blood pressure, and high cholesterol.',
    benefits: [
      'Rich in antioxidants',
      'Commonly used to protect against heart disease',
      'Supports heart health',
      'May help manage high blood pressure',
      'Reduces symptoms of heart failure',
      'Improves circulation in swollen legs and feet',
      'May support better sleep by alleviating insomnia',
      'Human studies suggest increases coronary artery blood flow'
    ]
  },
  {
    name: 'InnoSlim',
    doseMg: 250,
    doseRangeMin: 250,
    doseRangeMax: 250,
    category: 'individual',
    type: 'Blood Sugar and Lipid Metabolism',
    suggestedUse: 'Supports healthy blood sugar regulation and lipid metabolism by enhancing adiponectin levels and increasing AMPK activity.',
    benefits: [
      'Compound extracted from Panax notoginseng and Astragalus membranaceus',
      'Only nutraceutical shown to increase adiponectin levels',
      'Increases AMPK activity',
      'Lowers glucose levels in healthy obese and pre-diabetic individuals with hyperlipidemia'
    ]
  },

  {
    name: 'Lutein',
    doseMg: 5,
    doseRangeMin: 5,
    doseRangeMax: 20,
    category: 'individual',
    type: 'Eye Health, Antioxidant',
    suggestedUse: 'Supports eye health and protection from blue light damage.',
    benefits: [
      'Protects eyes from blue light damage',
      'Supports healthy vision',
      'May reduce risk of macular degeneration',
      'Antioxidant properties',
      'Supports skin health'
    ]
  },
  {
    name: 'Maca',
    doseMg: 50,
    doseRangeMin: 50,
    doseRangeMax: 2500,
    category: 'individual',
    type: 'Energy, Hormone Support, Adaptogen',
    suggestedUse: 'Supports energy, stamina, hormone balance, and fertility.',
    benefits: [
      'Increases energy and stamina',
      'Supports hormone balance',
      'May enhance fertility',
      'Improves mood and reduces anxiety',
      'Supports libido'
    ]
  },
  {
    name: 'Magnesium',
    doseMg: 50,
    doseRangeMin: 50,
    doseRangeMax: 800,
    category: 'individual',
    type: 'Mineral, Muscle & Nerve Function',
    suggestedUse: 'Supports muscle function, nerve health, bone strength, and energy production.',
    benefits: [
      'Essential for muscle and nerve function',
      'Supports bone health',
      'Helps regulate blood sugar',
      'Promotes heart health',
      'May improve sleep quality'
    ]
  },

  {
    name: 'Resveratrol',
    doseMg: 20,
    doseRangeMin: 20,
    doseRangeMax: 500,
    category: 'individual',
    type: 'Antioxidant, Anti-aging, Heart Health',
    suggestedUse: 'Supports cardiovascular health, longevity, and cellular protection.',
    benefits: [
      'Powerful antioxidant properties',
      'Supports heart health',
      'May promote longevity',
      'Anti-inflammatory effects',
      'Supports brain health'
    ]
  },
  {
    name: 'Omega 3',
    doseMg: 100,
    doseRangeMin: 100,
    doseRangeMax: 1000,
    category: 'individual',
    type: 'Heart Health, Anti-inflammatory, Brain Health',
    suggestedUse: 'Supports heart health, reduces inflammation, and promotes brain function.',
    benefits: [
      'Supports cardiovascular health',
      'Reduces inflammation',
      'Supports brain function and mental health',
      'May reduce triglyceride levels',
      'Supports joint health'
    ]
  },
  {
    name: 'Phosphatidylcholine',
    doseMg: 100,
    doseRangeMin: 100,
    doseRangeMax: 1300,
    category: 'individual',
    type: 'Brain & Liver Support',
    suggestedUse: 'Major component of cell membranes used to support cognitive function, liver detoxification, and fat metabolism. May help maintain healthy lipid levels.',
    benefits: [
      'Known for role in supporting brain function and memory',
      'Aids in liver regeneration and fat metabolism',
      'Contributes to maintaining healthy cell membranes',
      'Supports production of neurotransmitters like acetylcholine'
    ]
  },

  {
    name: 'Saw Palmetto Extract',
    doseMg: 50,
    doseRangeMin: 50,
    doseRangeMax: 300,
    category: 'individual',
    type: 'Prostate Health / Anti-inflammatory',
    suggestedUse: 'Supports prostate health, reduces inflammation, and promotes urinary tract function. May aid in hair loss and increase testosterone levels.',
    benefits: [
      'Used for improving prostate health',
      'Reduces inflammation',
      'Aids in urinary tract function',
      'May help increase testosterone levels',
      'May reduce hair loss',
      'Often used as natural alternative to estrogen-based medications'
    ]
  },
  {
    name: 'Stinging Nettle',
    doseMg: 50,
    doseRangeMin: 50,
    doseRangeMax: 350,
    category: 'individual',
    type: 'Prostate Health, Blood Pressure, Blood Sugar, Anti-inflammatory',
    suggestedUse: 'Supports prostate health, blood pressure regulation, blood sugar management, and helps reduce inflammation.',
    benefits: [
      'Supports prostate health',
      'Helps regulate blood pressure',
      'Supports blood sugar control',
      'Reduces inflammation',
      'May help with urinary tract health'
    ]
  },
  {
    name: 'Suma Root',
    doseMg: 100,
    doseRangeMin: 100,
    doseRangeMax: 500,
    category: 'individual',
    type: 'Immune Support, Blood Sugar, Sexual Performance, Testosterone',
    suggestedUse: 'Supports immune system function, blood sugar regulation, sexual performance, and healthy testosterone levels.',
    benefits: [
      'Supports immune system function',
      'Helps regulate blood sugar',
      'Supports sexual performance',
      'May help maintain healthy testosterone levels',
      'Adaptogenic properties'
    ]
  },
  {
    name: 'Vitamin E (Mixed Tocopherols)',
    doseMg: 25,
    doseRangeMin: 25,
    doseRangeMax: 2000,
    category: 'individual',
    type: 'Antioxidant & Skin Nourishment',
    suggestedUse: 'Powerful antioxidant commonly used to support skin health, reduce oxidative stress, and maintain healthy cell function. Balances oil production in skin.',
    benefits: [
      'Known for antioxidant properties',
      'Helps protect cells from oxidative damage',
      'May improve skin health by nourishing and balancing oil production',
      'May contribute to longer cell life',
      'Potential benefits for overall skin care'
    ]
  },
  {
    name: 'Milk Thistle',
    doseMg: 150,
    doseRangeMin: 150,
    doseRangeMax: 450,
    category: 'individual',
    type: 'Liver Support, Antioxidant, Detox',
    suggestedUse: 'Supports liver health and detoxification. Contains silymarin, a powerful antioxidant that protects liver cells from damage.',
    benefits: [
      'Protects liver cells from toxin damage',
      'Supports liver regeneration',
      'Powerful antioxidant (silymarin)',
      'May help lower cholesterol',
      'Supports healthy bile production'
    ]
  },
  {
    name: 'Calcium',
    doseMg: 200,
    doseRangeMin: 200,
    doseRangeMax: 1000,
    category: 'individual',
    type: 'Bone Health, Muscle Function, Mineral',
    suggestedUse: 'Essential mineral for bone strength, muscle function, nerve transmission, and cardiovascular health.',
    benefits: [
      'Supports strong bones and teeth',
      'Essential for muscle contraction',
      'Supports nerve signal transmission',
      'May help regulate blood pressure',
      'Important for blood clotting'
    ]
  },
  {
    name: 'Vitamin C',
    doseMg: 250,
    doseRangeMin: 250,
    doseRangeMax: 2000,
    category: 'individual',
    type: 'Immune Support, Antioxidant',
    suggestedUse: 'Essential vitamin supporting immune function, collagen synthesis, antioxidant protection, and iron absorption.',
    benefits: [
      'Powerful antioxidant protecting against free radicals',
      'Essential for immune system function',
      'Supports collagen production for skin and joint health',
      'Enhances iron absorption',
      'May reduce duration of common cold'
    ]
  },
  {
    name: 'Cape Aloe',
    doseMg: 50,
    doseRangeMin: 50,
    doseRangeMax: 450,
    category: 'individual',
    type: 'Digestive Support, Detox, Anti-inflammatory',
    suggestedUse: 'Supports digestive health, gentle detoxification, and may help with occasional constipation. Known for soothing properties.',
    benefits: [
      'Supports healthy digestion and bowel regularity',
      'Gentle detoxification properties',
      'Anti-inflammatory effects on digestive tract',
      'Supports gut health',
      'Rich in vitamins and minerals'
    ]
  },
];

// ============================================================================
// DETAILED BREAKDOWN OF SYSTEM SUPPORTS
// Updated from manufacturer (Alive Innovations) data — April 2026
// ============================================================================

export const SYSTEM_SUPPORT_DETAILS: SystemSupportDetails[] = [
  {
    name: 'Adrenal Support',
    doseMg: 420,
    systemSupported: 'Endocrine, Metabolism',
    suggestedDosage: '1-3x daily',
    description: 'Supports adrenal gland function and stress response. Complex of vitamins and herbs may help alleviate signs of Adrenal Fatigue.',
    activeIngredients: [
      {
        name: 'Vitamin C',
        amount: '20mg',
        description: 'from Camu Camu Berry',
        benefits: ['Powerful antioxidant', 'Supports immune function', 'Aids in adrenal hormone production']
      },
      {
        name: 'Pantothenic Acid',
        amount: '50mg',
        description: 'as Calcium Pantothenate',
        benefits: ['Essential for adrenal function', 'Supports stress hormone production', 'Aids energy metabolism']
      },
      {
        name: 'Adrenal',
        amount: '250mg',
        description: 'of bovine source, not an extract',
        benefits: ['Supports adrenal hormone balance', 'Provides glandular support', 'May help manage stress response']
      },
      {
        name: 'Licorice',
        amount: '50mg',
        description: 'root',
        benefits: ['Supports cortisol regulation', 'May reduce adrenal fatigue', 'Aids stress management']
      },
      {
        name: 'Ginger',
        amount: '25mg',
        description: 'rhizome',
        benefits: ['Anti-inflammatory properties', 'Supports digestion', 'Exhibits antibacterial effects']
      },
      {
        name: 'Kelp',
        amount: '25mg',
        description: 'entire plant',
        benefits: ['Rich in iodine for thyroid support', 'Supports metabolism', 'Provides trace minerals']
      },
    ]
  },
  {
    name: 'Beta Max',
    doseMg: 650,
    systemSupported: 'Liver, Gallbladder, Pancreas',
    suggestedDosage: '1-3x daily',
    description: 'Helps support liver, gallbladder, and pancreas. Regulates hepatic functions such as lipid and carbohydrate metabolism.',
    activeIngredients: [
      {
        name: 'Calcium',
        amount: '23.16mg',
        description: 'as dicalcium phosphate',
        benefits: ['Supports bone health', 'Aids muscle function', 'Essential for cellular signaling']
      },
      {
        name: 'Niacin',
        amount: '2.48mg',
        description: 'as niacinamide',
        benefits: ['Supports energy metabolism', 'Aids liver function', 'Helps maintain healthy cholesterol']
      },
      {
        name: 'Phosphorus',
        amount: '30.81mg',
        description: 'as dicalcium phosphate',
        benefits: ['Supports bone and teeth health', 'Aids energy production', 'Essential for cellular function']
      },
      {
        name: 'Choline Bitartrate',
        amount: '413.46mg',
        benefits: ['Supports liver fat metabolism', 'Aids brain and nerve function', 'Essential for cell membrane health']
      },
      {
        name: 'Inositol',
        amount: '39.76mg',
        benefits: ['Supports liver health', 'Aids cellular signaling', 'May help with mood regulation']
      },
      {
        name: 'Betaine HCl',
        amount: '18.88mg',
        benefits: ['Supports digestive function', 'Aids protein digestion', 'Helps maintain stomach pH']
      },
      {
        name: 'Lecithin',
        amount: '18.88mg',
        description: 'soy',
        benefits: ['Supports fat metabolism', 'Aids liver function', 'Helps with cholesterol processing']
      },
      {
        name: 'Artichoke',
        amount: '12.42mg',
        benefits: ['Supports bile production', 'Aids liver detoxification', 'May help lower cholesterol']
      },
      {
        name: 'Dandelion',
        amount: '12.42mg',
        description: 'herb',
        benefits: ['Supports liver and kidney function', 'Natural diuretic properties', 'Aids digestion']
      },
      {
        name: 'Milk Thistle',
        amount: '12.42mg',
        description: 'seed',
        benefits: ['Protects liver cells', 'Supports detoxification', 'May regenerate liver tissue']
      },
      {
        name: 'Turmeric',
        amount: '12.42mg',
        description: 'root',
        benefits: ['Powerful anti-inflammatory', 'Supports liver health', 'Rich in antioxidants']
      },
      {
        name: 'DL-Methionine',
        amount: '7.45mg',
        benefits: ['Essential amino acid', 'Supports liver detoxification', 'Aids in fat metabolism']
      },
    ]
  },
  {
    name: 'C Boost',
    doseMg: 598,
    systemSupported: 'Immune system',
    suggestedDosage: '1-3x daily',
    description: 'Vitamin C and bioflavonoids blend. Bioflavonoids enhance action and absorption of vitamin C. Used for antioxidant and anti-inflammatory properties.',
    activeIngredients: [
      {
        name: 'Vitamin C',
        amount: '61.89mg',
        description: 'as Ascorbic Acid',
        benefits: ['Powerful antioxidant', 'Supports immune function', 'May reduce risk of chronic diseases']
      },
      {
        name: 'Citrus Bioflavonoid Complex',
        amount: '348.12mg',
        benefits: ['Enhances vitamin C absorption', 'Supports cardiovascular health', 'Provides antioxidant protection']
      },
      {
        name: 'Camu Camu',
        amount: '187.99mg',
        description: 'berry extract',
        benefits: ['Rich in vitamin C', 'Helps fight inflammation', 'Supports immune system']
      },
    ]
  },
  {
    name: 'Endocrine Support',
    doseMg: 335,
    systemSupported: 'Endocrine',
    suggestedDosage: '1-3x daily',
    description: 'Supports endocrine system and pancreatic health. Helps utilize vitamins, improve energy production and ensure proper liver function.',
    activeIngredients: [
      {
        name: 'Pantothenic Acid',
        amount: '11.17mg',
        description: 'as Calcium Pantothenate',
        benefits: ['Supports adrenal function', 'Essential for energy metabolism', 'Aids stress hormone production']
      },
      {
        name: 'Zinc',
        amount: '11.17mg',
        description: 'as Zinc Oxide',
        benefits: ['Supports immune function', 'Essential for hormone production', 'Aids cellular metabolism']
      },
      {
        name: 'Manganese',
        amount: '11.17mg',
        description: 'as Manganese Sulfate',
        benefits: ['Supports bone health', 'Essential for enzyme function', 'Aids metabolism']
      },
      {
        name: 'Adrenal',
        amount: '111.67mg',
        description: 'of bovine source, not an extract',
        benefits: ['Supports hormonal balance', 'Provides glandular support', 'Aids endocrine function']
      },
      {
        name: 'Pancreas',
        amount: '44.67mg',
        description: 'of bovine source',
        benefits: ['Supports pancreatic function', 'Aids digestive enzyme production', 'Supports blood sugar regulation']
      },
      {
        name: 'Atlantic Sea Kelp',
        amount: '33.5mg',
        benefits: ['Rich in iodine for thyroid support', 'Supports metabolism', 'Provides essential minerals']
      },
      {
        name: 'Pituitary',
        amount: '33.5mg',
        description: 'of bovine source',
        benefits: ['Supports master gland function', 'Aids hormone regulation', 'Promotes endocrine balance']
      },
      {
        name: 'Hypothalamus',
        amount: '33.5mg',
        description: 'of bovine source',
        benefits: ['Supports hormonal control center', 'Aids body temperature regulation', 'Promotes metabolic balance']
      },
      {
        name: 'Dulse',
        amount: '33.5mg',
        description: 'leaf',
        benefits: ['Rich in minerals and iodine', 'Supports thyroid function', 'Provides trace nutrients']
      },
      {
        name: 'Yarrow',
        amount: '11.17mg',
        description: 'flower',
        benefits: ['Anti-inflammatory properties', 'Supports digestive health', 'Aids circulation']
      },
    ]
  },
  {
    name: 'Heart Support',
    doseMg: 689,
    systemSupported: 'Heart',
    suggestedDosage: '1-3x daily',
    description: 'Supports heart function. Combining magnesium, l-carnitine and l-taurine aids in blood pressure, nervous system, heart failure, oxidative stress, and myocardial contractions.',
    activeIngredients: [
      {
        name: 'Magnesium',
        amount: '126mg',
        description: 'from Magnesium Amino Acid Chelate',
        benefits: ['Supports heart rhythm', 'Aids muscle and nerve function', 'Helps regulate blood pressure']
      },
      {
        name: 'Heart',
        amount: '168mg',
        description: 'of bovine source, not an extract',
        benefits: ['Supports cardiovascular function', 'Provides cardiac tissue support', 'Aids heart muscle health']
      },
      {
        name: 'Inulin',
        amount: '42mg',
        description: 'from Chicory',
        benefits: ['Supports gut health', 'Prebiotic fiber benefits', 'Aids mineral absorption']
      },
      {
        name: 'L-Carnitine',
        amount: '175mg',
        benefits: ['Supports energy production in heart', 'Aids fat metabolism', 'May improve exercise performance']
      },
      {
        name: 'L-Taurine',
        amount: '87mg',
        benefits: ['Supports heart muscle contractions', 'Aids cardiovascular health', 'May help regulate blood pressure']
      },
      {
        name: 'CoEnzyme Q10',
        amount: '10mg',
        benefits: ['Supports heart energy production', 'Powerful antioxidant', 'May improve heart function']
      },
      {
        name: 'Phosphatidylcholine',
        amount: '11mg',
        benefits: ['Supports cell membrane health', 'Aids cardiovascular function', 'Supports fat metabolism']
      },
      {
        name: 'Sumac',
        amount: '70mg',
        benefits: ['Rich in antioxidants', 'Anti-inflammatory properties', 'Supports cardiovascular health']
      },
    ]
  },
  {
    name: 'Histamine Support',
    doseMg: 200,
    systemSupported: 'Immune, Histamine control',
    suggestedDosage: '1-3x daily',
    description: 'Supports immune system and normal levels of histamine. Helps stabilize mast cell membranes and reduce histamine reactions.',
    activeIngredients: [
      {
        name: 'Calcium',
        amount: '20.99mg',
        description: 'as dicalcium phosphate',
        benefits: ['Supports bone health', 'Aids cellular signaling', 'Essential for nerve function']
      },
      {
        name: 'Iron',
        amount: '1.76mg',
        description: 'as Ferrous Fumarate',
        benefits: ['Essential for blood health', 'Supports oxygen transport', 'Aids energy production']
      },
      {
        name: 'Vitamin B12',
        amount: '0.009mg',
        description: 'as Methylcobalamin',
        benefits: ['Supports nerve function', 'Essential for red blood cell formation', 'Aids energy metabolism']
      },
      {
        name: 'Phosphorus',
        amount: '27.93mg',
        description: 'as dicalcium phosphate',
        benefits: ['Supports bone and teeth health', 'Aids energy production', 'Essential for cellular function']
      },
      {
        name: 'Chromium',
        amount: '0.0009mg',
        description: 'as polynicotinate',
        benefits: ['Supports blood sugar regulation', 'Aids metabolism', 'May help with insulin sensitivity']
      },
      {
        name: 'Liver',
        amount: '72.09mg',
        description: 'of bovine source, not an extract',
        benefits: ['Supports liver function', 'Rich in nutrients', 'Provides glandular support']
      },
      {
        name: 'Bovine liver fat extract',
        amount: '36.04mg',
        benefits: ['Provides fat-soluble nutrients', 'Supports cellular health', 'Aids nutrient absorption']
      },
    ]
  },
  {
    name: 'Immune-C',
    doseMg: 358,
    systemSupported: 'Immune',
    suggestedDosage: '1-3x daily',
    description: 'Powerful formulation with Graviola, vitamin C, Camu Camu berry, and Cats Claw. Combined to offer great support to immune system.',
    activeIngredients: [
      {
        name: 'Vitamin C',
        amount: '8.39mg',
        description: 'from Camu Camu',
        benefits: ['Powerful antioxidant', 'Supports immune function', 'Aids collagen production']
      },
      {
        name: 'Camu Camu',
        amount: '69.92mg',
        description: 'berry',
        benefits: ['Extremely high in vitamin C', 'Helps fight inflammation', 'Supports immune function']
      },
      {
        name: 'Soursop (Graviola)',
        amount: '69.92mg',
        description: 'leaf',
        benefits: ['Rich in antioxidants', 'Supports immune system', 'Anti-inflammatory properties']
      },
      {
        name: 'Cats Claw',
        amount: '69.92mg',
        description: 'bark',
        benefits: ['Supports immune health', 'Anti-inflammatory properties', 'Exhibits antibacterial effects']
      },
      {
        name: 'Dragon\'s Blood Croton',
        amount: '69.92mg',
        description: 'sap',
        benefits: ['Wound healing properties', 'Anti-inflammatory effects', 'Supports immune function']
      },
      {
        name: 'Astragalus',
        amount: '69.92mg',
        description: 'root',
        benefits: ['Supports immune system', 'Antioxidant properties', 'May help protect organs']
      },
    ]
  },
  {
    name: 'Kidney & Bladder Support',
    doseMg: 565,
    systemSupported: 'Kidneys, Bladder',
    suggestedDosage: '1-3x daily',
    description: 'Designed for kidney and bladder support. May improve blood pressure and blood sugar; helps flush kidney stones and stop inflammatory diseases of urinary tract.',
    activeIngredients: [
      {
        name: 'Kidney',
        amount: '99.82mg',
        description: 'of bovine source, not an extract',
        benefits: ['Supports kidney function', 'Provides glandular support', 'Aids urinary health']
      },
      {
        name: 'Raw Liver Concentrate',
        amount: '99.82mg',
        description: 'of bovine source, not an extract',
        benefits: ['Supports liver function', 'Rich in nutrients', 'Aids detoxification']
      },
      {
        name: 'Uva-Ursi',
        amount: '112.8mg',
        description: 'leaf',
        benefits: ['Supports urinary tract health', 'Natural diuretic properties', 'Antimicrobial effects']
      },
      {
        name: 'Echinacea purpurea',
        amount: '112.8mg',
        description: 'extract',
        benefits: ['Supports immune function', 'Anti-inflammatory properties', 'Aids infection resistance']
      },
      {
        name: 'Goldenrod',
        amount: '99.82mg',
        description: 'aerial parts (Solidago)',
        benefits: ['Supports kidney function', 'Natural diuretic', 'Anti-inflammatory effects']
      },
      {
        name: 'Juniper',
        amount: '39.93mg',
        description: 'berry',
        benefits: ['Supports urinary health', 'Natural diuretic', 'Antioxidant properties']
      },
    ]
  },
  {
    name: 'Ligament Support',
    doseMg: 130,
    systemSupported: 'Muscles, Connective Tissues',
    suggestedDosage: '1-3x daily',
    description: 'Supports ligaments, disc, muscles, and tendon health. Helps improve stiffness, inflammation, arthritis, joint support, and soreness.',
    activeIngredients: [
      {
        name: 'Calcium',
        amount: '10.23mg',
        description: 'as Lactate, Dicalcium Phosphate',
        benefits: ['Supports bone health', 'Aids muscle contraction', 'Essential for connective tissue']
      },
      {
        name: 'Phosphorus',
        amount: '13.67mg',
        description: 'as Dicalcium Phosphate',
        benefits: ['Supports bone and teeth health', 'Aids energy production', 'Essential for cellular function']
      },
      {
        name: 'Magnesium',
        amount: '1.76mg',
        description: 'as Citrate',
        benefits: ['Supports muscle function', 'Aids nerve transmission', 'Helps reduce muscle cramping']
      },
      {
        name: 'Manganese',
        amount: '9.7mg',
        description: 'as Sulfate',
        benefits: ['Supports bone formation', 'Aids connective tissue health', 'Essential for cartilage production']
      },
      {
        name: 'Citrus Bioflavonoids',
        amount: '44.1mg',
        benefits: ['Supports collagen synthesis', 'Antioxidant properties', 'Aids tissue repair']
      },
      {
        name: 'Pancreatin (8x)',
        amount: '10.58mg',
        benefits: ['Aids protein digestion', 'Supports nutrient absorption', 'Anti-inflammatory effects']
      },
      {
        name: 'L-Lysine',
        amount: '4.41mg',
        benefits: ['Essential for collagen formation', 'Supports tissue repair', 'Aids calcium absorption']
      },
      {
        name: 'Ox Bile',
        amount: '4.41mg',
        description: 'Bovine Source',
        benefits: ['Aids fat digestion', 'Supports nutrient absorption', 'Helps process fat-soluble vitamins']
      },
      {
        name: 'Spleen',
        amount: '4.41mg',
        description: 'Bovine',
        benefits: ['Supports immune function', 'Provides glandular support', 'Rich in nutrients']
      },
      {
        name: 'Thymus',
        amount: '4.41mg',
        description: 'Bovine Source',
        benefits: ['Supports immune system', 'Aids tissue health', 'Provides glandular support']
      },
      {
        name: 'Betaine HCl',
        amount: '1.76mg',
        benefits: ['Supports digestion', 'Aids protein breakdown', 'Helps maintain stomach pH']
      },
      {
        name: 'Boron',
        amount: '0.09mg',
        description: 'as Amino Acid Chelate',
        benefits: ['Supports bone health', 'Aids calcium metabolism', 'May reduce joint inflammation']
      },
      {
        name: 'Bromelain',
        amount: '0.26mg',
        description: '600 GDU/mg',
        benefits: ['Anti-inflammatory enzyme', 'Supports joint health', 'Aids protein digestion']
      },
    ]
  },
  {
    name: 'Liver Support',
    doseMg: 530,
    systemSupported: 'Liver',
    suggestedDosage: '1-3x daily',
    description: 'Supports liver health. Helps reduce fatty necrosis, reduce stress on liver, support bile production, and improve liver function.',
    activeIngredients: [
      {
        name: 'Vitamin A',
        amount: '0.54mg',
        description: 'as Beta-Carotene',
        benefits: ['Supports vision health', 'Aids immune function', 'Essential for cellular growth']
      },
      {
        name: 'Liver',
        amount: '349.64mg',
        description: 'of bovine source, not an extract',
        benefits: ['Supports liver function', 'Rich in nutrients and vitamins', 'Provides glandular support']
      },
      {
        name: 'Dandelion',
        amount: '49.95mg',
        description: 'root',
        benefits: ['Supports liver detoxification', 'Natural diuretic properties', 'Aids digestion']
      },
      {
        name: 'Oregon Grape',
        amount: '49.95mg',
        description: 'root',
        benefits: ['Supports liver function', 'Antimicrobial properties', 'Aids bile production']
      },
      {
        name: 'Barberry',
        amount: '49.95mg',
        description: 'root',
        benefits: ['Supports digestive health', 'Antimicrobial effects', 'Aids liver function']
      },
      {
        name: 'Choline Bitartrate',
        amount: '9.99mg',
        benefits: ['Supports liver fat metabolism', 'Aids brain function', 'Essential for cell membranes']
      },
      {
        name: 'Inositol',
        amount: '9.99mg',
        benefits: ['Supports liver health', 'Aids cellular signaling', 'May help with mood regulation']
      },
      {
        name: 'Betaine HCl',
        amount: '9.99mg',
        benefits: ['Supports digestion', 'Aids protein breakdown', 'Helps maintain stomach pH']
      },
    ]
  },
  {
    name: 'Lung Support',
    doseMg: 242,
    systemSupported: 'Lungs, Immune',
    suggestedDosage: '1-3x daily',
    description: 'Supports lung and immune system health. Combination of vitamins and antioxidants support lungs, lymph nodes and thymus.',
    activeIngredients: [
      {
        name: 'Vitamin A',
        amount: '2.38mg',
        description: 'as palmitate',
        benefits: ['Supports respiratory health', 'Aids immune function', 'Maintains healthy mucous membranes']
      },
      {
        name: 'Vitamin C',
        amount: '15.84mg',
        description: 'as Ascorbic Acid',
        benefits: ['Powerful antioxidant', 'Supports immune function', 'Aids respiratory health']
      },
      {
        name: 'Vitamin B',
        amount: '14.85mg',
        description: 'as Calcium Pantothenate',
        benefits: ['Supports energy metabolism', 'Aids adrenal function', 'Essential for stress response']
      },
      {
        name: 'Lung',
        amount: '74.26mg',
        description: 'of bovine source, not from extract',
        benefits: ['Supports lung function', 'Provides respiratory tissue support', 'Aids breathing capacity']
      },
      {
        name: 'Adrenal',
        amount: '54.46mg',
        description: 'of bovine source, not from extract',
        benefits: ['Supports stress response', 'Aids hormone balance', 'Provides glandular support']
      },
      {
        name: 'Lymph',
        amount: '29.71mg',
        description: 'of bovine source, not from extract',
        benefits: ['Supports immune system', 'Aids lymphatic drainage', 'Provides tissue support']
      },
      {
        name: 'Eucalyptus',
        amount: '29.71mg',
        benefits: ['Supports respiratory health', 'Natural decongestant', 'Antimicrobial properties']
      },
      {
        name: 'Thymus',
        amount: '19.8mg',
        benefits: ['Supports immune function', 'Aids T-cell production', 'Provides glandular support']
      },
      {
        name: 'Psyllium husk',
        amount: '0.99mg',
        benefits: ['Supports digestive health', 'Provides fiber', 'Aids detoxification']
      },
    ]
  },
  {
    name: 'MG/K',
    doseMg: 90,
    systemSupported: 'Autonomic Nervous System, Adrenal Glands, Muscles, Blood Sugar, Bone and DNA',
    suggestedDosage: '1-3x daily',
    description: 'Concentrated blend of multiple forms of magnesium bound in potassium. Provides enhanced support for cells promoting overall cellular health.',
    activeIngredients: [
      {
        name: 'Magnesium Aspartate',
        amount: '7.18mg',
        benefits: ['Supports muscle and nerve function', 'Aids energy production']
      },
      {
        name: 'Potassium',
        amount: '19.56mg',
        description: 'as Aspartate',
        benefits: ['Supports heart function', 'Aids muscle contractions', 'Helps regulate blood pressure']
      },
      {
        name: 'Magnesium Taurate',
        amount: '1.5mg',
        benefits: ['Supports cardiovascular health', 'Calming effect on nervous system']
      },
      {
        name: 'Magnesium Orotate',
        amount: '2.1mg',
        benefits: ['Supports heart health', 'Aids cellular energy production']
      },
      {
        name: 'Magnesium Glycinate',
        amount: '1.8mg',
        benefits: ['Highly bioavailable form', 'Supports sleep and relaxation']
      },
      {
        name: 'Magnesium Malate',
        amount: '5.24mg',
        benefits: ['Supports energy production', 'Aids muscle function']
      },
      {
        name: 'Magnesium Chelate',
        amount: '11.97mg',
        benefits: ['Highly absorbable form', 'Supports overall magnesium levels']
      },
      {
        name: 'Magnesium Citrate',
        amount: '1.14mg',
        benefits: ['Supports digestive health', 'Well-absorbed form']
      },
      {
        name: 'Magnesium L-Threonate',
        amount: '39.52mg',
        benefits: ['Crosses blood-brain barrier', 'Supports cognitive function and memory', 'Supports brain health']
      },
    ]
  },
  {
    name: 'Mold RX',
    doseMg: 525,
    systemSupported: 'Detox - Mold',
    suggestedDosage: '1-3x daily',
    description: 'Detoxification of molds. Oregano, Chaga, Sage and other ingredients produce powerful antifungal, antibacterial and anti-inflammatory effect against mold.',
    activeIngredients: [
      {
        name: 'Wild Oregano',
        amount: '200mg',
        description: 'extract',
        benefits: ['Powerful antifungal properties', 'Antibacterial effects', 'Supports immune function']
      },
      {
        name: 'Pau D\'Arco',
        amount: '100mg',
        description: 'bark',
        benefits: ['Antifungal and antibacterial', 'Supports immune system', 'May help fight candida']
      },
      {
        name: 'Chaga Mushroom',
        amount: '75mg',
        description: 'extract',
        benefits: ['Rich in antioxidants', 'Supports immune function', 'Anti-inflammatory properties']
      },
      {
        name: 'Sage Leaf',
        amount: '50mg',
        benefits: ['Antimicrobial properties', 'Supports digestive health', 'Anti-inflammatory effects']
      },
      {
        name: 'Mullein Leaf',
        amount: '50mg',
        benefits: ['Supports respiratory health', 'Anti-inflammatory properties', 'May help clear mucus']
      },
      {
        name: 'Stinging Nettle',
        amount: '50mg',
        description: 'extract',
        benefits: ['Anti-inflammatory effects', 'Supports detoxification', 'Rich in nutrients']
      },
    ]
  },
  {
    name: 'Ovary Uterus Support',
    doseMg: 253,
    systemSupported: 'Female Reproductive System',
    suggestedDosage: '1-3x daily',
    description: 'Supports female reproductive system health. Helps regulate women\'s cycles, alleviate muscle spasms and may reduce risk for certain cancers.',
    activeIngredients: [
      {
        name: 'Calcium',
        amount: '19.26mg',
        description: 'as Dicalcium Phosphate',
        benefits: ['Supports bone health', 'Aids muscle function', 'Essential for reproductive health']
      },
      {
        name: 'Phosphorus',
        amount: '25.63mg',
        description: 'as Dicalcium Phosphate',
        benefits: ['Supports bone health', 'Aids energy production', 'Essential for cellular function']
      },
      {
        name: 'Zinc',
        amount: '4.13mg',
        description: 'as Citrate',
        benefits: ['Supports hormone production', 'Aids immune function', 'Essential for reproductive health']
      },
      {
        name: 'Ovary',
        amount: '82.68mg',
        description: 'Bovine Source',
        benefits: ['Supports ovarian function', 'Provides glandular support', 'Aids hormonal balance']
      },
      {
        name: 'Uterus',
        amount: '82.68mg',
        description: 'Bovine Source',
        benefits: ['Supports uterine health', 'Provides tissue support', 'Aids reproductive function']
      },
      {
        name: 'Blue Cohosh Root',
        amount: '0.83mg',
        benefits: ['Supports menstrual health', 'May help with muscle spasms', 'Traditional women\'s health herb']
      },
    ]
  },
  {
    name: 'Para X',
    doseMg: 523,
    systemSupported: 'Detox - Parasites',
    suggestedDosage: '1-3x daily',
    description: 'Supports intestinal health when exposed to parasites. Black walnut and wormwood treat parasitic worm infections naturally.',
    activeIngredients: [
      {
        name: 'Black Walnut',
        amount: '91.27mg',
        description: 'hull',
        benefits: ['Traditional antiparasitic', 'Supports digestive health', 'Antimicrobial properties']
      },
      {
        name: 'Pumpkin Powder',
        amount: '91.27mg',
        description: 'seed',
        benefits: ['Natural antiparasitic', 'Rich in nutrients', 'Supports digestive health']
      },
      {
        name: 'Wormwood Powder',
        amount: '91.27mg',
        description: 'aerial parts',
        benefits: ['Traditional antiparasitic', 'Supports digestive function', 'Antimicrobial effects']
      },
      {
        name: 'Hyssop Powder',
        amount: '45.64mg',
        description: 'aerial parts',
        benefits: ['Supports digestive health', 'Antimicrobial properties', 'Anti-inflammatory effects']
      },
      {
        name: 'Thyme',
        amount: '45.64mg',
        description: 'leaf',
        benefits: ['Antimicrobial properties', 'Supports immune function', 'Aids digestive health']
      },
      {
        name: 'Neem Powder',
        amount: '45.64mg',
        benefits: ['Traditional antiparasitic', 'Antimicrobial properties', 'Supports immune health']
      },
      {
        name: 'Pancreatin',
        amount: '28.29mg',
        benefits: ['Aids protein digestion', 'Supports nutrient absorption', 'Helps break down parasites']
      },
      {
        name: 'L-Lysine',
        amount: '22.82mg',
        benefits: ['Essential amino acid', 'Supports immune function', 'Aids protein synthesis']
      },
      {
        name: 'Ox Bile',
        amount: '22.82mg',
        description: 'Bovine Source',
        benefits: ['Aids fat digestion', 'Supports detoxification', 'Helps absorb nutrients']
      },
      {
        name: 'Bromelain',
        amount: '20.99mg',
        benefits: ['Anti-inflammatory enzyme', 'Aids protein digestion', 'Supports immune function']
      },
      {
        name: 'Pepsin',
        amount: '15.52mg',
        benefits: ['Aids protein digestion', 'Supports stomach function', 'Helps break down food']
      },
      {
        name: 'Cellulase',
        amount: '1.83mg',
        benefits: ['Breaks down plant fibers', 'Aids digestion', 'Supports nutrient absorption']
      },
    ]
  },
  {
    name: 'Prostate Support',
    doseMg: 202,
    systemSupported: 'Prostate',
    suggestedDosage: '1-3x daily',
    description: 'Supports general prostate health. Encourages anti-inflammation and proper function.',
    activeIngredients: [
      {
        name: 'Magnesium',
        amount: '3mg',
        description: 'as Citrate',
        benefits: ['Supports muscle function', 'Aids nerve transmission', 'Helps reduce inflammation']
      },
      {
        name: 'Zinc',
        amount: '14.98mg',
        description: 'as Amino Acid Chelate',
        benefits: ['Essential for prostate health', 'Supports immune function', 'Aids hormone production']
      },
      {
        name: 'Molybdenum',
        amount: '0.05mg',
        description: 'as Amino Acid Chelate',
        benefits: ['Supports enzyme function', 'Aids detoxification', 'Essential trace mineral']
      },
      {
        name: 'Potassium',
        amount: '3.99mg',
        description: 'as Aspartate',
        benefits: ['Supports heart function', 'Aids muscle contractions', 'Helps regulate fluid balance']
      },
      {
        name: 'Boron',
        amount: '0.25mg',
        description: 'as Amino Acid Chelate',
        benefits: ['Supports bone health', 'May help regulate hormones', 'Aids mineral metabolism']
      },
      {
        name: 'Prostate',
        amount: '89.87mg',
        description: 'Bovine Source',
        benefits: ['Supports prostate function', 'Provides glandular support', 'Aids reproductive health']
      },
      {
        name: 'Juniper Berry',
        amount: '49.93mg',
        benefits: ['Supports urinary health', 'Natural diuretic', 'Antioxidant properties']
      },
      {
        name: 'Chaga Mushroom',
        amount: '19.97mg',
        description: 'extract',
        benefits: ['Rich in antioxidants', 'Anti-inflammatory properties', 'Supports immune function']
      },
      {
        name: 'Betaine HCl',
        amount: '4.99mg',
        benefits: ['Supports digestion', 'Aids protein breakdown', 'Helps maintain stomach pH']
      },
      {
        name: 'Saw Palmetto Berry',
        amount: '14.98mg',
        benefits: ['Supports prostate health', 'May help with urinary function', 'Anti-inflammatory effects']
      },
    ]
  },
  {
    name: 'Spleen Support',
    doseMg: 203,
    systemSupported: 'Lymphatic, Blood',
    suggestedDosage: '1x daily',
    description: 'Supports spleen and lymphatic system health. Dandelion and nettle help the endocrine system including the spleen.',
    activeIngredients: [
      {
        name: 'Vitamin E',
        amount: '52.56mg',
        description: 'as dl-alpha Tocopheryl Acetate',
        benefits: ['Powerful antioxidant', 'Supports cellular health', 'Aids immune function']
      },
      {
        name: 'Bovine Spleen Concentrate',
        amount: '0.25mg',
        benefits: ['Supports spleen function', 'Aids immune system', 'Provides glandular support']
      },
      {
        name: 'Dandelion',
        amount: '75.09mg',
        description: 'extract',
        benefits: ['Supports liver and kidney function', 'Natural diuretic properties', 'Aids digestion']
      },
      {
        name: 'Nettle',
        amount: '75.09mg',
        description: 'root',
        benefits: ['Anti-inflammatory effects', 'Supports urinary health', 'Rich in nutrients']
      },
    ]
  },
  {
    name: 'Thyroid Support',
    doseMg: 291,
    systemSupported: 'Thyroid, Adrenal Glands',
    suggestedDosage: '1-3x daily',
    description: 'Provides necessary nutrients for proper thyroid function. Combines iodine and glandular concentrates.',
    activeIngredients: [
      {
        name: 'Iodine',
        amount: '1mg',
        description: 'from Kelp',
        benefits: ['Essential for thyroid hormone production', 'Supports metabolism', 'Aids energy regulation']
      },
      {
        name: 'Thyroid',
        amount: '60mg',
        description: 'Bovine Source',
        benefits: ['Supports thyroid function', 'Provides glandular support', 'Aids metabolic balance']
      },
      {
        name: 'Porcine Adrenal Concentrate',
        amount: '30mg',
        benefits: ['Supports adrenal function', 'Aids stress response', 'Provides glandular support']
      },
      {
        name: 'Pituitary',
        amount: '10mg',
        description: 'Bovine Source',
        benefits: ['Supports master gland function', 'Aids hormone regulation', 'Provides endocrine support']
      },
      {
        name: 'Spleen',
        amount: '10mg',
        description: 'Bovine Source',
        benefits: ['Supports immune function', 'Aids blood health', 'Provides glandular support']
      },
      {
        name: 'Kelp',
        amount: '180mg',
        benefits: ['Rich in iodine and minerals', 'Supports thyroid function', 'Aids metabolism']
      },
    ]
  },
];

// Combined catalog of ALL approved ingredients
export const ALL_INGREDIENTS = [...SYSTEM_SUPPORTS, ...INDIVIDUAL_INGREDIENTS];

// ============================================================================
// INGREDIENT NAME ALIASES - Maps common variations to canonical names
// ============================================================================

export const INGREDIENT_ALIASES: Record<string, string> = {
  // CoEnzyme Q10 variations
  'coq10': 'CoEnzyme Q10',
  'co q10': 'CoEnzyme Q10',
  'coenzyme q10': 'CoEnzyme Q10',
  'ubiquinone': 'CoEnzyme Q10',
  'co-q10': 'CoEnzyme Q10',

  // Hawthorn variations
  'hawthorn': 'Hawthorn Berry',
  'hawthorne': 'Hawthorn Berry',
  'hawthorne berry': 'Hawthorn Berry',
  'hawthorn berries': 'Hawthorn Berry',

  // Phosphatidylcholine variations
  'pc': 'Phosphatidylcholine',
  'phosphocholine': 'Phosphatidylcholine',

  // System Support spacing variations
  'cboost': 'C Boost',
  'c-boost': 'C Boost',

  // Common variations and misspellings
  'ahswaganda': 'Ashwagandha',
  'ashwaganda': 'Ashwagandha',
  'aswagandha': 'Ashwagandha',
  'curcuma': 'Curcumin',
  'turmeric': 'Curcumin',
  'turmeric root extract': 'Curcumin',
  'algae omega': 'Omega 3',
  'omega-3': 'Omega 3',
  'omega3': 'Omega 3',
  'fish oil': 'Omega 3',
  'ginko': 'Ginkgo Biloba Extract 24%',
  'ginkgo': 'Ginkgo Biloba Extract 24%',
  'ginkgo biloba': 'Ginkgo Biloba Extract 24%',
  'aloe vera powder': 'Aloe Vera',
  'cape aloe': 'Cape Aloe',
  "cat's claw": 'Cats Claw',
  'cats claw bark': 'Cats Claw',
  'vitamin e': 'Vitamin E (Mixed Tocopherols)',
  'mixed tocopherols': 'Vitamin E (Mixed Tocopherols)',
  'milk thistle': 'Milk Thistle',
  'silymarin': 'Milk Thistle',
  'vitamin c': 'Vitamin C',
  'ascorbic acid': 'Vitamin C',
  'cinnamon': 'Cinnamon 20:1',

  // Unit/Qualifier variations
  'magnesium': 'Magnesium',
  'mag': 'Magnesium',
  // Note: Zinc, Vitamin D3, and Vitamin B12 are sub-ingredients of system supports,
  // not standalone catalog items. Do not alias them here.

  // Common AI name variations that differ from catalog names
  'saw palmetto': 'Saw Palmetto Extract',
  'saw palmetto berry': 'Saw Palmetto Extract',
  'maca root': 'Maca',
  'maca root extract': 'Maca',
  'ashwagandha root': 'Ashwagandha',
  'ashwagandha extract': 'Ashwagandha',
  'ashwagandha root extract': 'Ashwagandha',
  'curcumin extract': 'Curcumin',
  'curcumin 95%': 'Curcumin',
  'ginger': 'Ginger Root',
  'ginger root extract': 'Ginger Root',
  'broccoli extract': 'Broccoli Concentrate',
  'broccoli sprout extract': 'Broccoli Concentrate',
  'broccoli sprout': 'Broccoli Concentrate',
  'bovine colostrum': 'Colostrum Powder',
  'colostrum': 'Colostrum Powder',
  'camu camu berry': 'Camu Camu',
  'camu camu berry extract': 'Camu Camu',
  'cape aloe leaf': 'Cape Aloe',
  'aloe ferox': 'Cape Aloe',
  'suma': 'Suma Root',
  'pfaffia paniculata': 'Suma Root',
  'brazilian ginseng': 'Suma Root',

  // ── System Support aliases (punctuation/formatting variations) ──
  'beta-max': 'Beta Max',
  'immune c': 'Immune-C',
  'immunec': 'Immune-C',
  'immune-c': 'Immune-C',
  'kidney bladder support': 'Kidney & Bladder Support',
  'kidney & bladder': 'Kidney & Bladder Support',
  'kidney and bladder support': 'Kidney & Bladder Support',
  'kidney and bladder': 'Kidney & Bladder Support',
  'mg k': 'MG/K',
  'mold-rx': 'Mold RX',
  'moldrx': 'Mold RX',
  'para-x': 'Para X',
  'parax': 'Para X',

  // ── Additional individual ingredient aliases ──
  'blackcurrant': 'Blackcurrant Extract',
  'black currant': 'Blackcurrant Extract',
  'black currant extract': 'Blackcurrant Extract',
  'chaga mushroom': 'Chaga',
  'chaga mushrooms': 'Chaga',
  'astragalus root': 'Astragalus',
  'astragalus root extract': 'Astragalus',
  'garlic extract': 'Garlic',
  'garlic bulb': 'Garlic',
  'garlic powder': 'Garlic',
  'ginko biloba': 'Ginkgo Biloba Extract 24%',
  'ginkgo biloba extract': 'Ginkgo Biloba Extract 24%',
  'trans-resveratrol': 'Resveratrol',
  'trans resveratrol': 'Resveratrol',
  'magnesium glycinate': 'Magnesium',
  'magnesium citrate': 'Magnesium',
  'magnesium oxide': 'Magnesium',
  'gamma aminobutyric acid': 'GABA',
  'gamma-aminobutyric acid': 'GABA',
  'camu camu extract': 'Camu Camu',
  "cat's claw bark": 'Cats Claw',
  'cinnamon bark': 'Cinnamon 20:1',
  'cinnamon bark extract': 'Cinnamon 20:1',
  'ceylon cinnamon': 'Cinnamon 20:1',
  'milk thistle extract': 'Milk Thistle',
  'milk thistle seed extract': 'Milk Thistle',
  'ashwagandha ksm-66': 'Ashwagandha',
  'ashwagandha ksm 66': 'Ashwagandha',
  'omega 3 fatty acids': 'Omega 3',
  'omega-3 fatty acids': 'Omega 3',
  'stinging nettle': 'Stinging Nettle',
  'nettle root': 'Stinging Nettle',
  'nettle leaf': 'Stinging Nettle',
  'saw palmetto extract': 'Saw Palmetto Extract',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalizes ingredient names to handle aliases and variations
 * CRITICAL: Check catalog FIRST to avoid corrupting canonical ingredient names
 * Only strip qualifiers if no direct match found (for AI-added extras)
 */
export function normalizeIngredientName(name: string): string {
  const trimmed = name.trim();
  const trimmedLower = trimmed.toLowerCase();

  // STEP 1: Check explicit alias map FIRST (exact match)
  if (INGREDIENT_ALIASES[trimmedLower]) {
    return INGREDIENT_ALIASES[trimmedLower];
  }

  // STEP 2: Try case-insensitive exact match in catalog (preserves canonical names)
  const exactMatch = ALL_INGREDIENTS.find(
    ing => ing.name.toLowerCase() === trimmedLower
  );
  if (exactMatch) {
    return exactMatch.name;
  }

  // STEP 3: ONLY if no match found, strip AI-added qualifiers and try again
  // CONSERVATIVE STRIPPING - Only remove things that are NEVER part of canonical names
  // Preserves: "Root", "Leaf", "Extract" (because they ARE in canonical names like "Ginger Root", "Blackcurrant Extract")
  // Removes: PE qualifiers, percentages, extraction ratios, parenthetical sources
  let stripped = trimmed
    // Remove PE (Plant Extract) qualifiers (e.g., "PE 1/8% Flavones", "PE 1/8%")
    .replace(/\s*PE\s+\d+\/\d+%?\s*\w*/gi, ' ')
    // Remove standalone percentage potencies (e.g., " 40%", " 24%", " 95%")
    .replace(/\s+\d+%\s*/g, ' ')
    // Remove parenthetical descriptors (e.g., "(soy)", "(powder)", "(bovine)")
    .replace(/\s*\([^)]+\)/g, '')
    // Remove dosage suffixes (e.g., "1000mg", "500 mg", "600mg")
    .replace(/\s+\d+\s*mg\b/gi, '')
    // Remove brand/trademark suffixes (e.g., "KSM-66", "Sensoril")
    .replace(/\s+KSM[-\s]?66/gi, '')
    // Normalize multiple spaces
    .replace(/\s+/g, ' ')
    .trim();

  const strippedLower = stripped.toLowerCase();

  // STEP 4: Check alias map with stripped name
  if (INGREDIENT_ALIASES[strippedLower]) {
    return INGREDIENT_ALIASES[strippedLower];
  }

  // STEP 5: Try catalog match with stripped name
  const strippedMatch = ALL_INGREDIENTS.find(
    ing => ing.name.toLowerCase() === strippedLower
  );
  if (strippedMatch) {
    return strippedMatch.name;
  }

  // STEP 6: Return stripped name if no match found (best effort cleanup)
  return stripped;
}

/**
 * Finds an ingredient by name (with alias support)
 */
export function findIngredientByName(name: string): IngredientInfo | undefined {
  const normalizedName = normalizeIngredientName(name);
  return ALL_INGREDIENTS.find(
    ing => ing.name.toLowerCase() === normalizedName.toLowerCase()
  );
}

export function getIngredientDose(name: string): number | undefined {
  const ingredient = findIngredientByName(name);
  return ingredient?.doseMg;
}

export function isValidIngredient(name: string): boolean {
  return findIngredientByName(name) !== undefined;
}

export function getSystemSupportDetails(name: string): SystemSupportDetails | undefined {
  const normalizedName = normalizeIngredientName(name);
  return SYSTEM_SUPPORT_DETAILS.find(
    formula => formula.name.toLowerCase() === normalizedName.toLowerCase()
  );
}
