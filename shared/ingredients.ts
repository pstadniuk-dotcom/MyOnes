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

export interface BaseFormulaDetails {
  name: string;
  doseMg: number;
  systemSupported: string;
  activeIngredients: SubIngredient[];
  suggestedDosage: string;
  description: string;
}

// ============================================================================
// BASE FORMULAS (19 total) - FIXED dosages, cannot be adjusted
// ============================================================================

export const BASE_FORMULAS: IngredientInfo[] = [
  {
    name: 'Adrenal Support',
    doseMg: 420,
    category: 'base',
    description: 'Supports adrenal gland function and stress response. This complex of vitamins and herbs may help to alleviate signs of Adrenal Fatigue.',
  },
  {
    name: 'Beta Max',
    doseMg: 2500,
    category: 'base',
    description: 'Supports liver, gallbladder, and pancreas. Helps regulate multiple hepatic functions such as lipid and carbohydrate metabolism and proper liver functions.',
  },
  {
    name: 'C Boost',
    doseMg: 1680,
    category: 'base',
    description: 'Vitamin C and bioflavonoids blend with antioxidant and anti-inflammatory properties. Helps the body fight against viral infections.',
  },
  {
    name: 'Chaga Mix',
    doseMg: 3600,
    category: 'base',
    description: 'Chaga mushrooms may be beneficial for lowering cholesterol levels, slowing cancer growth, supporting immune function, and reducing blood pressure.',
  },
  {
    name: 'Endocrine Support',
    doseMg: 350,
    category: 'base',
    description: 'Supports the endocrine system with pantothenic acid, manganese, and glandular sources. Helps utilize vitamins, improve energy production and ensure proper liver function.',
  },
  {
    name: 'Heart Support',
    doseMg: 450,
    category: 'base',
    description: 'Supports heart function with magnesium, l-carnitine and l-taurine. Aids in blood pressure, nervous system, heart failure, oxidative stress, and myocardial contractions.',
  },
  {
    name: 'Histamine Support',
    doseMg: 190,
    category: 'base',
    description: 'Important for immune system support when compromised. Helps stabilize mast cell membranes and reduce histamine reactions.',
  },
  {
    name: 'Immune-C',
    doseMg: 430,
    category: 'base',
    description: 'Powerful immune support formulation with Graviola, vitamin C, Camu Camu berry, and Cats Claw.',
  },
  {
    name: 'Kidney & Bladder Support',
    doseMg: 400,
    category: 'base',
    description: 'Supports kidney and bladder function. May improve blood pressure and blood sugar; helps flush kidney stones and stop inflammatory diseases of the urinary tract.',
  },
  {
    name: 'Ligament Support',
    doseMg: 400,
    category: 'base',
    description: 'Supports muscles and connective tissue. Helps improve stiffness, inflammation, arthritis, joint support, and soreness.',
  },
  {
    name: 'Liver Support',
    doseMg: 480,
    category: 'base',
    description: 'For individuals experiencing decreased liver functions. Helps reduce fatty necrosis, reduce stress on liver, support bile production, and improve liver function.',
  },
  {
    name: 'Lung Support',
    doseMg: 250,
    category: 'base',
    description: 'Supports lungs and immune system. Combination of vitamins and antioxidants support lungs, lymph nodes and thymus.',
  },
  {
    name: 'MG/K',
    doseMg: 540,
    category: 'base',
    description: 'Concentrated blend of seven forms of magnesium bound in potassium. Supports autonomic nervous system, adrenal glands, muscles, blood sugar, bone and DNA.',
  },
  {
    name: 'Mold RX',
    doseMg: 525,
    category: 'base',
    description: 'Detoxification of molds. Oregano, Chaga, Sage produce powerful antifungal, antibacterial and anti-inflammatory effects against mold.',
  },
  {
    name: 'Ovary Uterus Support',
    doseMg: 300,
    category: 'base',
    description: 'Supports female reproductive system. Helps regulate women\'s cycles, alleviate muscle spasms and may reduce risk for certain cancers.',
  },
  {
    name: 'Para X',
    doseMg: 500,
    category: 'base',
    description: 'Eliminates parasites from the body through detox. Black walnut and wormwood treat parasitic worm infections naturally.',
  },
  {
    name: 'Prostate Support',
    doseMg: 300,
    category: 'base',
    description: 'Supports prostate and male reproductive systems. Encourages anti-inflammation and proper function.',
  },
  {
    name: 'Spleen Support',
    doseMg: 400,
    category: 'base',
    description: 'Supports liver, kidney, and spleen. Dandelion and nettle help the endocrine system including the spleen.',
  },
  {
    name: 'Thyroid Support',
    doseMg: 470,
    category: 'base',
    description: 'Provides necessary nutrients for proper thyroid function. Combines iodine and glandular concentrates.',
  },
];

// ============================================================================
// INDIVIDUAL INGREDIENTS (42 total) - ADJUSTABLE within dose ranges
// ============================================================================

export const INDIVIDUAL_INGREDIENTS: IngredientInfo[] = [
  {
    name: 'Alfalfa',
    doseMg: 200,
    doseRangeMin: 100,
    doseRangeMax: 1000,
    category: 'individual',
    type: 'Hormonal Support, Antioxidant, Blood Health, Anti-inflammatory',
    suggestedUse: 'May support hormonal balance, antioxidant activity, blood health, and help with inflammation.',
    benefits: [
      'May help lower cholesterol levels',
      'Offers benefits for blood sugar management',
      'Commonly used to relieve symptoms of menopause',
      'Rich in antioxidants and essential nutrients like vitamin K, copper, folate, and magnesium'
    ]
  },
  {
    name: 'Aloe Vera Powder',
    doseMg: 250,
    doseRangeMin: 250,
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
    doseMg: 600,
    doseRangeMin: 600,
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
    doseMg: 300,
    doseRangeMin: 300,
    doseRangeMax: 500,
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
    doseMg: 500,
    doseRangeMin: 500,
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
    doseMg: 200,
    doseRangeMin: 100,
    doseRangeMax: 400,
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
    doseMg: 2500,
    doseRangeMin: 2500,
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
    name: 'Cape Aloe',
    doseMg: 15,
    doseRangeMin: 15,
    doseRangeMax: 30,
    category: 'individual',
    type: 'Digestive Health, Wound Healing, Anti-inflammatory',
    suggestedUse: 'May support wound healing, digestive health, and provide antioxidant and anti-inflammatory benefits.',
    benefits: [
      'Primarily used to treat wounds, burns, eczema, and psoriasis',
      'Functions as herbal laxative that may regulate bowel movements',
      'Supports overall digestive health',
      'Sometimes referred to as intestinal cleanser'
    ]
  },
  {
    name: 'Cats Claw',
    doseMg: 30,
    doseRangeMin: 30,
    doseRangeMax: 500,
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
    doseMg: 2000,
    doseRangeMin: 1000,
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
    name: 'Cilantro',
    doseMg: 200,
    doseRangeMin: 200,
    doseRangeMax: 500,
    category: 'individual',
    type: 'Detox, Antimicrobial, Anti-inflammatory',
    suggestedUse: 'May help with detoxification by removing heavy metals from body. May support immune health by reducing harmful bacteria.',
    benefits: [
      'Known for ability to help remove metals like mercury, lead, and aluminum',
      'May improve effectiveness of antibiotics and antiviral medicines',
      'May support heart health and boost energy levels',
      'Offers benefits for individuals with diabetes'
    ]
  },
  {
    name: 'Cinnamon 20:1',
    doseMg: 1000,
    doseRangeMin: 500,
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
    doseMg: 200,
    doseRangeMin: 100,
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
    doseMg: 1000,
    doseRangeMin: 500,
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
    name: 'Fulvic Acid',
    doseMg: 250,
    doseRangeMin: 250,
    doseRangeMax: 500,
    category: 'individual',
    type: 'Allergy Support, Anti-Inflammatory, Brain Health',
    suggestedUse: 'May help with reducing inflammation, improving brain function, and supporting overall immune health. Might aid in blocking reactions that cause allergy symptoms.',
    benefits: [
      'May help alleviate allergy symptoms by blocking triggering reactions',
      'Shown to have potential benefits for brain health',
      'Possibly slows or prevents progression of neurodegenerative diseases',
      'May help reduce swelling',
      'Explored for potential anticancer properties'
    ]
  },
  {
    name: 'GABA',
    doseMg: 100,
    doseRangeMin: 100,
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
    doseMg: 200,
    doseRangeMin: 200,
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
    doseMg: 500,
    doseRangeMin: 500,
    doseRangeMax: 2000,
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
    name: 'Graviola',
    doseMg: 500,
    doseRangeMin: 500,
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
    name: 'Green Tea',
    doseMg: 676,
    doseRangeMin: 676,
    doseRangeMax: 676,
    category: 'individual',
    type: 'Antioxidant, Metabolism Support, Cognitive Function',
    suggestedUse: 'May help support cognitive function, boost metabolism, and aid in cardiovascular health.',
    benefits: [
      'Known for high levels of polyphenols',
      'May improve cognitive function',
      'Boosts metabolism',
      'May decrease risk of cardiovascular disease',
      'Supports weight loss',
      'Aids digestion',
      'Improves heart health',
      'Potentially supports management of type 2 diabetes and Alzheimer\'s'
    ]
  },
  {
    name: 'Glutathione',
    doseMg: 600,
    doseRangeMin: 600,
    doseRangeMax: 600,
    category: 'individual',
    type: 'Antioxidant, Immune Support, Liver Health',
    suggestedUse: 'May support immune system, assist in detoxification, and contribute to liver health by metabolizing toxins.',
    benefits: [
      'Tripeptide with various functions - acts as powerful antioxidant',
      'Breaks down free radicals',
      'Supports immune function',
      'Regenerates vitamins C and E',
      'Activates certain enzymes',
      'Aids liver and gallbladder in processing fats',
      'Helps metabolize toxins',
      'Plays role in DNA creation and repair'
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
    name: 'Lions Mane',
    doseMg: 200,
    doseRangeMin: 200,
    doseRangeMax: 200,
    category: 'individual',
    type: 'Cognitive and Mental Health',
    suggestedUse: 'Supports brain health, reduces anxiety and depression symptoms, and provides anti-inflammatory and antioxidant benefits.',
    benefits: [
      'May protect against dementia',
      'May reduce mild symptoms of anxiety and depression',
      'Helps repair nerve damage',
      'Strong anti-inflammatory and antioxidant properties',
      'Immune-boosting properties',
      'Animal studies suggest may lower risk of heart disease, cancer, ulcers, and diabetes'
    ]
  },
  {
    name: 'L-Theanine',
    doseMg: 200,
    doseRangeMin: 200,
    doseRangeMax: 400,
    category: 'individual',
    type: 'Antioxidant / Wellbeing',
    suggestedUse: 'Supports stress relief, anxiety reduction, boosts focus, enhances immunity, and may help support blood pressure and improve sleep.',
    benefits: [
      'Known for promoting relaxation and reducing stress and anxiety',
      'Boosts focus',
      'Enhances immunity by reducing inflammation',
      'May help support healthy blood pressure levels',
      'Improves sleep quality',
      'Often added as powerful antioxidant'
    ]
  },
  {
    name: 'Milk Thistle',
    doseMg: 420,
    doseRangeMin: 200,
    doseRangeMax: 420,
    category: 'individual',
    type: 'Liver Health / Detox',
    suggestedUse: 'Supports liver and gallbladder health, promotes detoxification.',
    benefits: [
      'Historically used for liver disorders and gallbladder problems',
      'Promoted as dietary supplement for hepatitis, cirrhosis, jaundice',
      'May help with indigestion',
      'Beneficial for liver protection and detoxification'
    ]
  },
  {
    name: 'NAD+',
    doseMg: 100,
    doseRangeMin: 100,
    doseRangeMax: 300,
    category: 'individual',
    type: 'Anti-Aging / Cellular Health',
    suggestedUse: 'Supports DNA repair, cell rejuvenation, and anti-aging processes.',
    benefits: [
      'Plays crucial role in many biological processes',
      'Activates reactions within cells',
      'Facilitates DNA repair',
      'Helps with cosmetic aspects of aging and cell rejuvenation',
      'Can reduce risks of age-related diseases'
    ]
  },
  {
    name: 'NMN',
    doseMg: 250,
    doseRangeMin: 250,
    doseRangeMax: 250,
    category: 'individual',
    type: 'Anti-Aging / Cellular Health',
    suggestedUse: 'Supports high blood pressure regulation, liver health, and metabolism.',
    benefits: [
      'Stimulates activity of mitochondria (vital to metabolism)',
      'Mitochondria transform glucose and oxygen into cellular energy',
      'Essential for mitochondrial health',
      'Supports overall cellular function'
    ]
  },
  {
    name: 'Red Ginseng',
    doseMg: 200,
    doseRangeMin: 200,
    doseRangeMax: 400,
    category: 'individual',
    type: 'Immune Support / Energy',
    suggestedUse: 'Supports immune system function, enhances energy levels, and promotes blood sugar regulation.',
    benefits: [
      'May help increase insulin production',
      'Enhances blood sugar uptake in cells',
      'Provides powerful antioxidant protection',
      'May improve energy production',
      'Boosts overall immune system health'
    ]
  },
  {
    name: 'Red Propolis',
    doseMg: 500,
    doseRangeMin: 500,
    doseRangeMax: 500,
    category: 'individual',
    type: 'Immune & Inflammatory Support',
    suggestedUse: 'Resin from Brazilian red bees with powerful antioxidant and anti-inflammatory properties. May support immune function, reduce inflammation, and promote cellular health.',
    benefits: [
      'May assist in boosting immune system',
      'Helps reduce inflammation throughout body',
      'Could support skin health',
      'Combats oxidative stress',
      'Promotes general wellness',
      'Antioxidant properties protect cells from damage',
      'Supports body\'s natural healing processes'
    ]
  },
  {
    name: 'Rosemary',
    doseMg: 100,
    doseRangeMin: 100,
    doseRangeMax: 600,
    category: 'individual',
    type: 'Brain Health / Skin & Hair Support',
    suggestedUse: 'Supports brain health, improves memory, and promotes healthy skin and hair growth.',
    benefits: [
      'Used in traditional medicine for astringent, tonic, and antispasmodic properties',
      'One of oldest known medicinal herbs',
      'Historically used to enhance mental function and memory',
      'May be beneficial for skin health',
      'Promotes hair growth'
    ]
  },
  {
    name: 'Parsley',
    doseMg: 100,
    doseRangeMin: 200,
    doseRangeMax: 800,
    category: 'individual',
    type: 'Bone Health / Antioxidant, Blood Health, High in Vitamin K',
    suggestedUse: 'Diuretic, Anti-Inflammatory, Bone Health, Antioxidant.',
    benefits: [
      'Works as powerful natural diuretic',
      'Helps reduce bloating and blood pressure',
      'Rich in vitamin K - supports bone growth and mineral density',
      'Contains high levels of beta carotene, folate, and vitamin B12',
      'Contributes to antioxidant properties'
    ]
  },
  {
    name: 'Phosphatidylcholine',
    doseMg: 250,
    doseRangeMin: 250,
    doseRangeMax: 1200,
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
    name: 'Quercetin',
    doseMg: 50,
    doseRangeMin: 50,
    doseRangeMax: 500,
    category: 'individual',
    type: 'Antioxidant / Heart Support, Immune System',
    suggestedUse: 'Supports heart health, reduces inflammation, and stabilizes histamine release for antihistamine benefits.',
    benefits: [
      'May help protect against heart disease and cancer',
      'Stabilizes cells that release histamine',
      'Provides anti-inflammatory and antihistamine effects',
      'Powerful antioxidant - supports overall health and reduces oxidative stress'
    ]
  },
  {
    name: 'Saw Palmetto Extract',
    doseMg: 320,
    doseRangeMin: 320,
    doseRangeMax: 320,
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
    name: 'Sceletium',
    doseMg: 15,
    doseRangeMin: 15,
    doseRangeMax: 40,
    category: 'individual',
    type: 'Mood Support / Neurocognitive',
    suggestedUse: 'Supports anxiety relief, mood enhancement, and may improve cognitive function. May assist in alleviating symptoms of depression.',
    benefits: [
      'Traditionally used for mood-altering purposes',
      'Especially for anxiety and depression relief',
      'Clinical trials suggest potential anxiolytic (anxiety-relieving) benefits',
      'Antidepressant properties',
      'Neurocognitive benefits'
    ]
  },
  {
    name: 'Shilajit',
    doseMg: 300,
    doseRangeMin: 300,
    doseRangeMax: 300,
    category: 'individual',
    type: 'Energy & Immunity Support',
    suggestedUse: 'Supports healthy testosterone levels, boosts energy, and promotes overall vitality. May aid in combating chronic fatigue and signs of aging.',
    benefits: [
      'Contains fulvic acid and over 84 minerals',
      'Serves as potent antioxidant to boost immunity',
      'Improves memory',
      'Reduces inflammation',
      'Increases energy',
      'Acts as diuretic to help remove excess fluid'
    ]
  },
  {
    name: 'Stinging Nettle',
    doseMg: 500,
    doseRangeMin: 500,
    doseRangeMax: 1500,
    category: 'individual',
    type: 'Antioxidant, Digestive Health, Anti-inflammatory',
    suggestedUse: 'Supports overall health and may help with inflammation, sore muscles and joints, enlarged prostate and more.',
    benefits: [
      'Used for many years to help treat inflammation',
      'Helps with sore muscles and joints',
      'May help with enlarged prostate',
      'May help control blood sugar',
      'Supports healthy blood pressure',
      'May help with anemia, gout, and urinary tract health'
    ]
  },
  {
    name: 'Suma Root',
    doseMg: 500,
    doseRangeMin: 500,
    doseRangeMax: 1500,
    category: 'individual',
    type: 'Adaptogen & Anti-Inflammatory',
    suggestedUse: 'May support body in managing chronic inflammation, high cortisol levels, and cognitive function. Acts as adaptogen to fight stressors like bacteria, toxins, and mental stress.',
    benefits: [
      'Known for adaptogenic properties',
      'Helps body handle stressors like bacteria, toxins, and mental stress',
      'May provide relief from chronic inflammation',
      'Helps with high cortisol levels',
      'Linked to potential benefits in cancer treatments',
      'May improve sexual dysfunction'
    ]
  },
  {
    name: 'Turmeric Root Extract 4:1',
    doseMg: 400,
    doseRangeMin: 400,
    doseRangeMax: 1000,
    category: 'individual',
    type: 'Anti-inflammatory & Antioxidant Support',
    suggestedUse: 'Concentrated form of curcuminoids with powerful anti-inflammatory and antioxidant properties. Often used to support joint health, digestion, and inflammation balance.',
    benefits: [
      'Commonly used for managing inflammation',
      'Reduces joint pain',
      'Supports liver health',
      'Antioxidant properties help neutralize free radicals',
      'Anti-inflammatory actions may benefit arthritis and digestive discomfort'
    ]
  },
  {
    name: 'Vitamin C',
    doseMg: 90,
    doseRangeMin: 90,
    doseRangeMax: 90,
    category: 'individual',
    type: 'Antioxidant & Immune Support',
    suggestedUse: 'Potent antioxidant that supports immune function, may reduce risk of chronic diseases, and helps body absorb iron. Beneficial in managing high blood pressure and reducing risk of heart disease.',
    benefits: [
      'Widely known for ability to boost immune system',
      'Prevents iron deficiency',
      'May help reduce risk of chronic diseases like heart disease',
      'Manages high blood pressure',
      'May lower uric acid levels and prevent gout attacks',
      'Plays role in body\'s overall antioxidant defense system'
    ]
  },
  {
    name: 'Vitamin E',
    doseMg: 2000,
    doseRangeMin: 2000,
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
];

// ============================================================================
// DETAILED BREAKDOWN OF BASE FORMULAS
// ============================================================================

export const BASE_FORMULA_DETAILS: BaseFormulaDetails[] = [
  {
    name: 'Adrenal Support',
    doseMg: 420,
    systemSupported: 'Endocrine, Metabolism',
    suggestedDosage: '1-3x daily',
    description: 'Supports adrenal gland function and stress response. Complex of vitamins and herbs may help alleviate signs of Adrenal Fatigue.',
    activeIngredients: [
      { name: 'Vitamin C', amount: '20mg', description: 'from Camu Camu Berry' },
      { name: 'Pantothenic Acid', amount: '50mg', description: 'as Calcium Pantothenate' },
      { name: 'Adrenal', amount: '250mg', description: 'of bovine source, not an extract' },
      { name: 'Licorice', amount: '50mg', description: 'root' },
      { name: 'Ginger', amount: '25mg', description: 'rhizome' },
      { name: 'Kelp', amount: '25mg', description: 'entire plant' },
      { name: 'Rhodiola', amount: '20mg' },
    ]
  },
  {
    name: 'Beta Max',
    doseMg: 2500,
    systemSupported: 'Liver, Gallbladder, Pancreas',
    suggestedDosage: '1-3x daily',
    description: 'Helps support liver, gallbladder, and pancreas. Regulates hepatic functions such as lipid and carbohydrate metabolism.',
    activeIngredients: [
      { name: 'Calcium', amount: '220mg', description: 'as dicalcium phosphate' },
      { name: 'Niacin', amount: '10mg', description: 'as niacinamide' },
      { name: 'Phosphorus', amount: '164mg', description: 'as dicalcium phosphate' },
      { name: 'Choline Bitartrate', amount: '1664mg' },
      { name: 'Inositol', amount: '160mg' },
      { name: 'Betaine HCl', amount: '76mg' },
      { name: 'Lecithin', amount: '76mg', description: 'soy' },
      { name: 'Artichoke', amount: '50mg' },
      { name: 'Dandelion', amount: '50mg', description: 'herb' },
      { name: 'Milk Thistle', amount: '50mg', description: 'seed' },
      { name: 'Turmeric', amount: '50mg', description: 'root' },
      { name: 'DL-Methionine', amount: '30mg' },
    ]
  },
  {
    name: 'C Boost',
    doseMg: 1680,
    systemSupported: 'Immune system',
    suggestedDosage: '1-3x daily',
    description: 'Vitamin C and bioflavonoids blend. Bioflavonoids enhance action and absorption of vitamin C. Used for antioxidant and anti-inflammatory properties.',
    activeIngredients: [
      { name: 'Vitamin C', amount: '80mg', description: 'as Ascorbic Acid' },
      { name: 'Citrus bioflavonoid Complex', amount: '1100mg' },
      { name: 'Camu Camu Berry extract', amount: '500mg' },
    ]
  },
  {
    name: 'Chaga Mix',
    doseMg: 3600,
    systemSupported: 'Immune system',
    suggestedDosage: '1 daily',
    description: 'Chaga mushrooms may lower cholesterol, slow cancer growth, support immune function, and reduce blood pressure.',
    activeIngredients: [
      { name: 'Chaga mushroom', amount: '3600mg' },
    ]
  },
  {
    name: 'Endocrine Support',
    doseMg: 350,
    systemSupported: 'Endocrine',
    suggestedDosage: '1-3x daily',
    description: 'Supports endocrine system. Helps utilize vitamins, improve energy production and ensure proper liver function. Pantothenic acid supports health and function of adrenal glands.',
    activeIngredients: [
      { name: 'Pantothenic Acid', amount: '4.5mg', description: 'as Ca Pantothenate' },
      { name: 'Zinc', amount: '5.3mg', description: 'as Amino Acid Chelate' },
      { name: 'Manganese', amount: '1.8mg', description: 'as Sulfate' },
      { name: 'Ovary & Adrenal', amount: 'proprietary', description: 'of bovine source-not an extract' },
      { name: 'Goldenseal', amount: 'proprietary', description: 'leaf' },
      { name: 'Kelp', amount: 'proprietary', description: 'entire plant' },
      { name: 'Pituitary', amount: 'proprietary' },
      { name: 'Hypothalamus', amount: 'proprietary' },
      { name: 'Dulse', amount: 'proprietary' },
      { name: 'Yarrow Flower', amount: 'proprietary' },
    ]
  },
  {
    name: 'Heart Support',
    doseMg: 450,
    systemSupported: 'Heart',
    suggestedDosage: '1-3x daily',
    description: 'Supports heart function. Combining magnesium, l-carnitine and l-taurine aids in blood pressure, nervous system, heart failure, oxidative stress, and myocardial contractions.',
    activeIngredients: [
      { name: 'Magnesium', amount: '126mg', description: 'from Magnesium Amino Acid Chelate' },
      { name: 'Heart', amount: 'proprietary', description: 'of bovine source, not an extract' },
      { name: 'Inulin', amount: 'proprietary', description: 'from Chicory' },
      { name: 'L-Carnitine', amount: '175mg' },
      { name: 'L-Taurine', amount: '87mg' },
      { name: 'Coenzyme Q10', amount: '21mg' },
      { name: 'Sumac', amount: '70mg' },
    ]
  },
  {
    name: 'Histamine Support',
    doseMg: 190,
    systemSupported: 'Immune, Histamine control',
    suggestedDosage: '1-3x daily',
    description: 'Important for immune system when compromised by environmental or intrinsic factors. Helps stabilize mast cell membranes and reduce histamine reactions.',
    activeIngredients: [
      { name: 'Calcium', amount: '38mg', description: 'as dicalcium phosphate' },
      { name: 'Iron', amount: '1.95mg', description: 'as Ferrous Fumarate' },
      { name: 'Vitamin B12 Methylcobalamin', amount: '10mcg', description: 'as cyanocobalamin' },
      { name: 'Phosphorus', amount: '29mg', description: 'as dicalcium phosphate' },
      { name: 'Chromium', amount: '1mcg', description: 'as polynicotinate' },
      { name: 'Liver', amount: '80mg', description: 'of bovine source, not an extract' },
      { name: 'Bovine liver fat extract', amount: '40mg' },
    ]
  },
  {
    name: 'Immune-C',
    doseMg: 430,
    systemSupported: 'Immune',
    suggestedDosage: '1-3x daily',
    description: 'Powerful formulation with Graviola, vitamin C, Camu Camu berry, and Cats Claw. Combined to offer great support to immune system.',
    activeIngredients: [
      { name: 'Vitamin C', amount: '8.4mg', description: 'from Camu Camu' },
      { name: 'Soursop (Graviola)', amount: '70mg', description: 'leaf' },
      { name: 'Cats Claw', amount: '70mg', description: 'bark' },
      { name: 'Dragon\'s Blood Croton', amount: '70mg', description: 'sap' },
      { name: 'Astragalus', amount: '70mg', description: 'root' },
      { name: 'Camu Camu', amount: '70mg', description: 'berry' },
    ]
  },
  {
    name: 'Kidney & Bladder Support',
    doseMg: 400,
    systemSupported: 'Kidneys, Bladder',
    suggestedDosage: '1-3x daily',
    description: 'Designed for kidney and bladder support. May improve blood pressure and blood sugar; helps flush kidney stones and stop inflammatory diseases of urinary tract.',
    activeIngredients: [
      { name: 'Raw Kidney concentrate', amount: 'proprietary', description: 'of bovine source, not an extract' },
      { name: 'Raw Liver Concentrate', amount: 'proprietary', description: 'of bovine source, not an extract' },
      { name: 'Uva-Ursi', amount: 'proprietary', description: 'leaf' },
      { name: 'Echinacea purpurea', amount: 'proprietary', description: 'root' },
      { name: 'Goldenrod', amount: 'proprietary', description: 'aerial parts (Solidago)' },
      { name: 'Disodium Phosphate', amount: 'proprietary' },
      { name: 'Juniper', amount: 'proprietary', description: 'berry' },
      { name: 'Dicalcium phosphate', amount: 'proprietary' },
    ]
  },
  {
    name: 'Ligament Support',
    doseMg: 400,
    systemSupported: 'Muscles, Connective Tissues',
    suggestedDosage: '1-3x daily',
    description: 'Supports muscles and connective tissue. Ideal to help improve stiffness, inflammation, arthritis, joint support, and soreness.',
    activeIngredients: [
      { name: 'Calcium', amount: '4mg', description: 'as Lactate, Dicalcium Phosphate' },
      { name: 'Phosphorus', amount: '29mg', description: 'as Dicalcium Phosphate' },
      { name: 'Magnesium', amount: '2mg', description: 'as Citrate' },
      { name: 'Manganese', amount: '11mg', description: 'as Sulfate' },
      { name: 'Citrus Bioflavonoids', amount: '50mg' },
      { name: 'Pancreatin (8X)', amount: '12mg' },
      { name: 'L-Lysine', amount: '5mg' },
      { name: 'Ox Bile', amount: '5mg' },
      { name: 'Spleen (Bovine)', amount: '5mg' },
      { name: 'Thymus (Bovine)', amount: '5mg' },
      { name: 'Betaine HCI', amount: '2mg' },
      { name: 'Boron', amount: '100mcg', description: 'as Amino Acid Chelate' },
      { name: 'Bromelain', amount: '0.3mg', description: '600 GDU/mg' },
    ]
  },
  {
    name: 'Liver Support',
    doseMg: 480,
    systemSupported: 'Liver',
    suggestedDosage: '1-3x daily',
    description: 'For individuals experiencing decreased liver functions. May reduce fatty necrosis, reduce stress on liver, support bile production, and improve liver function.',
    activeIngredients: [
      { name: 'Vitamin A', amount: '1,000 IU', description: '100% as Beta-Carotene' },
      { name: 'Liver', amount: '350mg', description: 'of bovine source, not an extract' },
      { name: 'Dandelion', amount: '50mg', description: 'root' },
      { name: 'Oregon Grape', amount: '50mg', description: 'root' },
      { name: 'Barberry', amount: '50mg', description: 'root' },
      { name: 'Choline Bitartrate', amount: '10mg' },
      { name: 'Inositol', amount: '10mg' },
      { name: 'Betaine HCl', amount: '10mg' },
      { name: 'Disodium Phosphate', amount: 'proprietary' },
      { name: 'Calcium', amount: 'proprietary' },
    ]
  },
  {
    name: 'Lung Support',
    doseMg: 250,
    systemSupported: 'Lungs, Immune',
    suggestedDosage: '1-3x daily',
    description: 'Supports lungs and immune system. Combination of vitamins and antioxidants support lungs, lymph nodes and thymus.',
    activeIngredients: [
      { name: 'Vitamin A', amount: '8,000 IU', description: 'as palmitate' },
      { name: 'Vitamin C', amount: '16mg', description: 'Ascorbic Acid' },
      { name: 'Vitamin B', amount: '15mg', description: 'as Calcium Pantothenate' },
      { name: 'Lung', amount: '75mg', description: 'of bovine source, not from extract' },
      { name: 'Adrenal', amount: '55mg', description: 'of bovine source, not from extract' },
      { name: 'Lymph', amount: '30mg', description: 'of bovine source, not from extract' },
      { name: 'Eucalyptus', amount: '30mg' },
      { name: 'Thymus', amount: '20mg' },
      { name: 'Psyllium husk', amount: '1mg' },
    ]
  },
  {
    name: 'MG/K',
    doseMg: 540,
    systemSupported: 'Autonomic Nervous System, Adrenal Glands, Muscles, Blood Sugar, Bone and DNA',
    suggestedDosage: '2 capsules daily',
    description: 'Concentrated blend of seven forms of magnesium ingeniously bound in potassium. Provides enhanced support for cells promoting overall cellular health.',
    activeIngredients: [
      { name: 'Magnesium', amount: '500mg', description: 'from Aspartate, Taurate, Orotate, Glycinate, Malate, Chelate, Citrate' },
      { name: 'Potassium', amount: '39mg', description: 'from Potassium Aspartate Complex' },
      { name: 'Colostrum', amount: '40mg' },
    ]
  },
  {
    name: 'Mold RX',
    doseMg: 525,
    systemSupported: 'Detox - Mold',
    suggestedDosage: '1-3x daily',
    description: 'Detoxification of molds. Oregano, Chaga, Sage and other ingredients produce powerful antifungal, antibacterial and anti-inflammatory effect against mold.',
    activeIngredients: [
      { name: 'Wild oregano extract', amount: '200mg' },
      { name: 'Pau D\'Arco', amount: '100mg', description: 'bark' },
      { name: 'Chaga Mushroom', amount: '75mg' },
      { name: 'Sage Leaf', amount: '50mg' },
      { name: 'Mullein Leaf', amount: '50mg' },
      { name: 'Stinging Nettle', amount: '50mg' },
      { name: 'Oxbile', amount: '25mg' },
      { name: 'Fulvic/Humic', amount: '35mg' },
    ]
  },
  {
    name: 'Ovary Uterus Support',
    doseMg: 300,
    systemSupported: 'Female Reproductive System',
    suggestedDosage: '1-3x daily',
    description: 'Supports female reproductive system. Helps regulate women\'s cycles, alleviate muscle spasms and may reduce risk for certain cancers.',
    activeIngredients: [
      { name: 'Calcium', amount: '26mg', description: 'as Dicalcium Phosphate' },
      { name: 'Phosphorus', amount: '21mg', description: 'as Dicalcium Phosphate' },
      { name: 'Zinc', amount: '5mg', description: 'as Citrate' },
      { name: 'Ovary (Bovine)', amount: '100mg' },
      { name: 'Uterus (Bovine)', amount: '100mg' },
      { name: 'Blue Cohosh Root', amount: '1mg' },
    ]
  },
  {
    name: 'Para X',
    doseMg: 500,
    systemSupported: 'Detox - Parasites',
    suggestedDosage: '1-3x daily',
    description: 'Eliminates parasites from body through detox. Black walnut and wormwood treat parasitic worm infections naturally.',
    activeIngredients: [
      { name: 'Black Walnut', amount: '100mg', description: 'hull' },
      { name: 'Pumpkin Powder', amount: '100mg', description: 'seed' },
      { name: 'Wormwood Powder', amount: '100mg', description: 'aerial parts' },
      { name: 'Hyssop Powder', amount: '50mg', description: 'aerial parts' },
      { name: 'Thyme', amount: '50mg', description: 'leaf' },
      { name: 'Pancreatin', amount: '31mg' },
      { name: 'L-Lysine', amount: '25mg' },
      { name: 'Ox Bile', amount: '25mg' },
      { name: 'Pepsin', amount: '17mg' },
      { name: 'Cellulase', amount: '2mg' },
      { name: 'Bromelain', amount: '84 MCU' },
      { name: 'Neem leaf powder', amount: '50mg' },
    ]
  },
  {
    name: 'Prostate Support',
    doseMg: 300,
    systemSupported: 'Prostate',
    suggestedDosage: '1-3x daily',
    description: 'Supports prostate and male reproductive systems. Encourages anti-inflammation and proper function.',
    activeIngredients: [
      { name: 'Magnesium', amount: '3mg', description: 'as Citrate' },
      { name: 'Zinc', amount: '15mg', description: 'as Amino Acid Chelate' },
      { name: 'Molybdenum', amount: '50mcg', description: 'as Amino Acid Chelate' },
      { name: 'Potassium', amount: '4mg', description: 'as Aspartate' },
      { name: 'Boron', amount: '250mcg', description: 'as Amino Acid Chelate' },
      { name: 'Prostate (Bovine)', amount: '90mg' },
      { name: 'Juniper Berry', amount: '50mg' },
      { name: 'Chaga Mushroom', amount: '20mg' },
      { name: 'Betaine HCI', amount: '5mg' },
      { name: 'Saw Palmetto Berry', amount: '15mg' },
    ]
  },
  {
    name: 'Spleen Support',
    doseMg: 400,
    systemSupported: 'Lymphatic, Blood',
    suggestedDosage: '1x daily',
    description: 'Supports liver, kidney, and spleen. Dandelion and nettle help the endocrine system including the spleen.',
    activeIngredients: [
      { name: 'Vitamin E', amount: '75 IU', description: 'as dl-alpha Tocopheryl Acetate' },
      { name: 'Bovine Spleen Concentrate', amount: '250mcg' },
      { name: 'Dandelion', amount: '75mg', description: 'aerial parts' },
      { name: 'Nettle', amount: '75mg', description: 'root' },
    ]
  },
  {
    name: 'Thyroid Support',
    doseMg: 470,
    systemSupported: 'Thyroid, Adrenal Glands',
    suggestedDosage: '1-3x daily',
    description: 'Provides necessary nutrients for proper thyroid function. Combines iodine and glandular concentrates.',
    activeIngredients: [
      { name: 'Iodine', amount: '900mcg', description: 'from Kelp' },
      { name: 'Raw Bovine Thyroid Concentrate', amount: '60mg', description: 'Thyroxine free' },
      { name: 'Porcine Adrenal Concentrate', amount: '30mg' },
      { name: 'Raw Bovine Pituitary Concentrate', amount: '10mg' },
      { name: 'Raw Porcine Spleen Concentrate', amount: '10mg' },
      { name: 'Kelp', amount: '180mg' },
    ]
  },
];

// Combined catalog of ALL approved ingredients
export const ALL_INGREDIENTS = [...BASE_FORMULAS, ...INDIVIDUAL_INGREDIENTS];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getIngredientDose(name: string): number | undefined {
  const ingredient = ALL_INGREDIENTS.find(ing => ing.name === name);
  return ingredient?.doseMg;
}

export function isValidIngredient(name: string): boolean {
  return ALL_INGREDIENTS.some(ing => ing.name === name);
}

export function getBaseFormulaDetails(name: string): BaseFormulaDetails | undefined {
  return BASE_FORMULA_DETAILS.find(formula => formula.name === name);
}
