// Pre-built research data for common supplement ingredients
// This provides research citations without requiring database queries

interface ResearchStudy {
  title: string;
  journal: string;
  year: number;
  authors: string;
  findings: string;
  sampleSize?: number;
  pubmedUrl?: string;
  evidenceLevel: 'strong' | 'moderate' | 'preliminary' | 'limited';
  studyType: 'rct' | 'meta_analysis' | 'systematic_review' | 'cohort' | 'observational' | 'review';
}

interface IngredientResearch {
  summary: string;
  keyBenefits: string[];
  safetyProfile: string;
  recommendedFor: string[];
  studies: ResearchStudy[];
}

// Pre-built research database
const ingredientResearchData: Record<string, IngredientResearch> = {
  'ashwagandha': {
    summary: 'Ashwagandha (Withania somnifera) is an adaptogenic herb traditionally used in Ayurvedic medicine. Modern research supports its use for stress reduction, anxiety management, and physical performance enhancement.',
    keyBenefits: [
      'Reduces cortisol and stress markers',
      'Improves anxiety symptoms',
      'May enhance muscle strength and recovery',
      'Supports cognitive function'
    ],
    safetyProfile: 'Generally well-tolerated. May interact with thyroid medications and sedatives. Not recommended during pregnancy.',
    recommendedFor: ['Stress management', 'Athletic performance', 'Anxiety support', 'Sleep quality'],
    studies: [
      {
        title: 'A prospective, randomized double-blind, placebo-controlled study of safety and efficacy of a high-concentration full-spectrum extract of ashwagandha root in reducing stress and anxiety in adults',
        journal: 'Indian Journal of Psychological Medicine',
        year: 2012,
        authors: 'Chandrasekhar K, Kapoor J, Anishetty S',
        findings: 'Significant reduction in stress scores (44% reduction) and serum cortisol levels compared to placebo.',
        sampleSize: 64,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/23439798/',
        evidenceLevel: 'strong',
        studyType: 'rct'
      },
      {
        title: 'Effects of Ashwagandha (Withania somnifera) on Physical Performance: Systematic Review and Bayesian Meta-Analysis',
        journal: 'Journal of Functional Morphology and Kinesiology',
        year: 2021,
        authors: 'Bonilla DA, et al.',
        findings: 'Ashwagandha supplementation significantly improved VO2 max, strength, and recovery in both trained and untrained individuals.',
        sampleSize: 615,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/34544533/',
        evidenceLevel: 'strong',
        studyType: 'meta_analysis'
      }
    ]
  },
  'magnesium': {
    summary: 'Magnesium is an essential mineral involved in over 300 enzymatic reactions. It plays crucial roles in energy production, muscle function, nervous system regulation, and sleep quality.',
    keyBenefits: [
      'Supports muscle and nerve function',
      'Improves sleep quality',
      'Reduces muscle cramps',
      'Supports cardiovascular health'
    ],
    safetyProfile: 'Well-tolerated at recommended doses. High doses may cause GI upset. Caution with kidney disease.',
    recommendedFor: ['Sleep support', 'Muscle recovery', 'Stress management', 'Heart health'],
    studies: [
      {
        title: 'The effect of magnesium supplementation on primary insomnia in elderly: A double-blind placebo-controlled clinical trial',
        journal: 'Journal of Research in Medical Sciences',
        year: 2012,
        authors: 'Abbasi B, et al.',
        findings: 'Magnesium supplementation improved sleep efficiency, sleep time, and melatonin concentration.',
        sampleSize: 46,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/23853635/',
        evidenceLevel: 'moderate',
        studyType: 'rct'
      }
    ]
  },
  'vitamin d': {
    summary: 'Vitamin D is a fat-soluble vitamin that functions as a hormone. It is essential for calcium absorption, bone health, immune function, and mood regulation.',
    keyBenefits: [
      'Supports bone health and calcium absorption',
      'Enhances immune function',
      'May improve mood and reduce depression risk',
      'Supports muscle function'
    ],
    safetyProfile: 'Safe at recommended doses. Toxicity possible with very high doses (>10,000 IU daily for extended periods).',
    recommendedFor: ['Bone health', 'Immune support', 'Mood support', 'General wellness'],
    studies: [
      {
        title: 'Vitamin D and the Immune System',
        journal: 'Journal of Investigative Medicine',
        year: 2011,
        authors: 'Aranow C',
        findings: 'Vitamin D is crucial for both innate and adaptive immune responses. Deficiency linked to increased autoimmunity and infection susceptibility.',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/21527855/',
        evidenceLevel: 'strong',
        studyType: 'review'
      }
    ]
  },
  'curcumin': {
    summary: 'Curcumin is the primary bioactive compound in turmeric. It possesses powerful anti-inflammatory and antioxidant properties, with research supporting benefits for joint health, brain function, and cardiovascular health.',
    keyBenefits: [
      'Potent anti-inflammatory effects',
      'Strong antioxidant properties',
      'May improve brain function and reduce depression',
      'Supports joint health and mobility'
    ],
    safetyProfile: 'Generally safe. Poor bioavailability without piperine. May interact with blood thinners.',
    recommendedFor: ['Joint health', 'Inflammation', 'Brain health', 'Heart health'],
    studies: [
      {
        title: 'Efficacy of Turmeric Extracts and Curcumin for Alleviating the Symptoms of Joint Arthritis: A Systematic Review and Meta-Analysis',
        journal: 'Journal of Medicinal Food',
        year: 2016,
        authors: 'Daily JW, Yang M, Park S',
        findings: 'Curcumin (about 1000 mg/day) provided significant improvement in arthritis symptoms comparable to NSAIDs.',
        sampleSize: 1500,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/27533649/',
        evidenceLevel: 'strong',
        studyType: 'meta_analysis'
      },
      {
        title: 'Curcumin: A Review of Its Effects on Human Health',
        journal: 'Foods',
        year: 2017,
        authors: 'Hewlings SJ, Kalman DS',
        findings: 'Comprehensive review demonstrating curcumin\'s anti-inflammatory, antioxidant, and neuroprotective properties.',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/29065496/',
        evidenceLevel: 'strong',
        studyType: 'review'
      }
    ]
  },
  'omega 3': {
    summary: 'Omega-3 fatty acids (EPA and DHA) are essential polyunsaturated fats crucial for brain function, cardiovascular health, and reducing inflammation throughout the body.',
    keyBenefits: [
      'Supports cardiovascular health',
      'Reduces inflammation',
      'Supports brain function and mental health',
      'May improve eye health'
    ],
    safetyProfile: 'Very safe at recommended doses. High doses may increase bleeding risk. Fish oil may cause fishy burps.',
    recommendedFor: ['Heart health', 'Brain function', 'Joint health', 'Eye health'],
    studies: [
      {
        title: 'Omega-3 Fatty Acids and Cardiovascular Disease: Effects on Risk Factors, Molecular Pathways, and Clinical Events',
        journal: 'Journal of the American College of Cardiology',
        year: 2011,
        authors: 'Mozaffarian D, Wu JH',
        findings: 'Omega-3 supplementation reduces triglycerides, blood pressure, and risk of sudden cardiac death.',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/22051327/',
        evidenceLevel: 'strong',
        studyType: 'review'
      }
    ]
  },
  'zinc': {
    summary: 'Zinc is an essential trace mineral involved in immune function, protein synthesis, wound healing, DNA synthesis, and cell division. It supports over 300 enzymes in the body.',
    keyBenefits: [
      'Supports immune system function',
      'Aids wound healing',
      'Supports protein synthesis',
      'May reduce duration of common cold'
    ],
    safetyProfile: 'Safe at recommended doses. High doses can interfere with copper absorption. May cause nausea if taken on empty stomach.',
    recommendedFor: ['Immune support', 'Wound healing', 'Skin health', 'Testosterone support'],
    studies: [
      {
        title: 'Zinc lozenges and the common cold: a meta-analysis comparing zinc acetate and zinc gluconate',
        journal: 'JRSM Open',
        year: 2017,
        authors: 'Hemilä H',
        findings: 'Zinc lozenges shortened common cold duration by 33% when started within 24 hours of symptom onset.',
        sampleSize: 575,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/28515951/',
        evidenceLevel: 'strong',
        studyType: 'meta_analysis'
      }
    ]
  },
  'vitamin c': {
    summary: 'Vitamin C (ascorbic acid) is a water-soluble vitamin and powerful antioxidant essential for immune function, collagen synthesis, and iron absorption.',
    keyBenefits: [
      'Powerful antioxidant protection',
      'Supports immune function',
      'Essential for collagen production',
      'Enhances iron absorption'
    ],
    safetyProfile: 'Very safe. Excess is excreted in urine. Very high doses may cause GI upset or kidney stones in susceptible individuals.',
    recommendedFor: ['Immune support', 'Skin health', 'Antioxidant protection', 'Iron absorption'],
    studies: [
      {
        title: 'Vitamin C and Immune Function',
        journal: 'Nutrients',
        year: 2017,
        authors: 'Carr AC, Maggini S',
        findings: 'Vitamin C supports various cellular functions of the immune system and supplementation prevents and treats respiratory infections.',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/29099763/',
        evidenceLevel: 'strong',
        studyType: 'review'
      }
    ]
  },
  'b12': {
    summary: 'Vitamin B12 (cobalamin) is essential for nerve function, DNA synthesis, and red blood cell formation. Deficiency is common, especially in vegetarians and older adults.',
    keyBenefits: [
      'Supports nerve function',
      'Essential for red blood cell production',
      'Supports energy metabolism',
      'May improve mood and cognitive function'
    ],
    safetyProfile: 'Extremely safe even at high doses as excess is excreted. No known toxicity.',
    recommendedFor: ['Energy support', 'Nerve health', 'Vegetarians/vegans', 'Cognitive function'],
    studies: [
      {
        title: 'Vitamin B12 deficiency',
        journal: 'American Family Physician',
        year: 2003,
        authors: 'Oh R, Brown DL',
        findings: 'B12 supplementation reverses deficiency symptoms including fatigue, weakness, and neurological issues.',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/12643357/',
        evidenceLevel: 'strong',
        studyType: 'review'
      }
    ]
  },
  'probiotics': {
    summary: 'Probiotics are live beneficial bacteria that support gut health, immune function, and may influence mood through the gut-brain axis.',
    keyBenefits: [
      'Supports digestive health',
      'Enhances immune function',
      'May improve mental health',
      'Helps restore gut flora after antibiotics'
    ],
    safetyProfile: 'Generally very safe. Mild bloating may occur initially. Caution in immunocompromised individuals.',
    recommendedFor: ['Gut health', 'Immune support', 'After antibiotic use', 'IBS management'],
    studies: [
      {
        title: 'Probiotics for the Prevention of Antibiotic-Associated Diarrhea',
        journal: 'Cochrane Database of Systematic Reviews',
        year: 2017,
        authors: 'Goldenberg JZ, et al.',
        findings: 'Probiotic supplementation significantly reduces antibiotic-associated diarrhea risk by 60%.',
        sampleSize: 11811,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/29257353/',
        evidenceLevel: 'strong',
        studyType: 'meta_analysis'
      }
    ]
  },
  'coq10': {
    summary: 'Coenzyme Q10 (CoQ10) is a naturally occurring antioxidant crucial for cellular energy production. Levels decline with age and statin use.',
    keyBenefits: [
      'Supports cellular energy production',
      'Powerful antioxidant',
      'Supports heart health',
      'May reduce statin-related muscle pain'
    ],
    safetyProfile: 'Very well tolerated. May interact with blood thinners. Best absorbed with fat.',
    recommendedFor: ['Heart health', 'Energy support', 'Statin users', 'Anti-aging'],
    studies: [
      {
        title: 'Coenzyme Q10 supplementation in heart failure: a meta-analysis',
        journal: 'American Journal of Clinical Nutrition',
        year: 2013,
        authors: 'Fotino AD, Thompson-Paul AM, Bazzano LA',
        findings: 'CoQ10 supplementation improved ejection fraction and reduced mortality in heart failure patients.',
        sampleSize: 1000,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/23221577/',
        evidenceLevel: 'strong',
        studyType: 'meta_analysis'
      }
    ]
  },
  'saw palmetto': {
    summary: 'Saw palmetto is an extract from the berries of the Serenoa repens plant. It\'s commonly used for prostate health and urinary function in men.',
    keyBenefits: [
      'Supports prostate health',
      'May improve urinary symptoms',
      'May help with hair loss',
      'Anti-inflammatory properties'
    ],
    safetyProfile: 'Generally safe. May interact with hormone medications. Not recommended during pregnancy.',
    recommendedFor: ['Prostate health', 'Urinary function', 'BPH symptoms', 'Hair health'],
    studies: [
      {
        title: 'Serenoa repens for benign prostatic hyperplasia',
        journal: 'Cochrane Database of Systematic Reviews',
        year: 2012,
        authors: 'Tacklind J, et al.',
        findings: 'Saw palmetto improved urinary symptoms and flow measures comparable to finasteride.',
        sampleSize: 5000,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/23235581/',
        evidenceLevel: 'moderate',
        studyType: 'meta_analysis'
      }
    ]
  },
  'milk thistle': {
    summary: 'Milk thistle contains silymarin, a powerful antioxidant and anti-inflammatory compound that supports liver health and detoxification.',
    keyBenefits: [
      'Supports liver health and detoxification',
      'Powerful antioxidant',
      'May protect against liver damage',
      'Supports healthy cholesterol'
    ],
    safetyProfile: 'Very safe with few side effects. May lower blood sugar. Possible allergic reaction in ragweed-allergic individuals.',
    recommendedFor: ['Liver support', 'Detoxification', 'Antioxidant protection', 'Alcohol users'],
    studies: [
      {
        title: 'Milk Thistle in Liver Diseases: Past, Present, Future',
        journal: 'Phytotherapy Research',
        year: 2010,
        authors: 'Abenavoli L, et al.',
        findings: 'Silymarin demonstrates hepatoprotective effects through antioxidant, anti-inflammatory, and antifibrotic mechanisms.',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/20564545/',
        evidenceLevel: 'moderate',
        studyType: 'review'
      }
    ]
  },
  'turmeric': {
    summary: 'Turmeric is a golden spice containing curcumin and other curcuminoids with powerful anti-inflammatory and antioxidant properties.',
    keyBenefits: [
      'Strong anti-inflammatory effects',
      'Antioxidant protection',
      'Supports joint health',
      'May support brain health'
    ],
    safetyProfile: 'Generally safe. Better absorbed with black pepper. May interact with blood thinners.',
    recommendedFor: ['Joint health', 'Inflammation', 'Digestive health', 'Brain health'],
    studies: [
      {
        title: 'Efficacy of Turmeric Extracts and Curcumin for Alleviating the Symptoms of Joint Arthritis',
        journal: 'Journal of Medicinal Food',
        year: 2016,
        authors: 'Daily JW, Yang M, Park S',
        findings: 'Turmeric extracts showed significant improvement in arthritis symptoms.',
        sampleSize: 1500,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/27533649/',
        evidenceLevel: 'strong',
        studyType: 'meta_analysis'
      }
    ]
  },
  'berberine': {
    summary: 'Berberine is a bioactive compound found in several plants. Research shows powerful effects on blood sugar regulation and metabolic health.',
    keyBenefits: [
      'Supports healthy blood sugar levels',
      'May improve insulin sensitivity',
      'Supports cardiovascular health',
      'May aid weight management'
    ],
    safetyProfile: 'Generally safe. May interact with diabetes and blood pressure medications. Start with low dose.',
    recommendedFor: ['Blood sugar support', 'Metabolic health', 'Weight management', 'Cardiovascular health'],
    studies: [
      {
        title: 'Efficacy of Berberine in Patients with Type 2 Diabetes',
        journal: 'Metabolism',
        year: 2008,
        authors: 'Yin J, Xing H, Ye J',
        findings: 'Berberine significantly decreased HbA1c, fasting blood glucose, and triglycerides similar to metformin.',
        sampleSize: 116,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/18510590/',
        evidenceLevel: 'strong',
        studyType: 'rct'
      }
    ]
  },
  'lion\'s mane': {
    summary: 'Lion\'s Mane (Hericium erinaceus) is a medicinal mushroom with unique compounds that may support brain health and nerve regeneration.',
    keyBenefits: [
      'Supports cognitive function',
      'May promote nerve growth factor (NGF)',
      'Supports mental clarity',
      'May reduce anxiety and depression'
    ],
    safetyProfile: 'Generally very safe. Rare allergic reactions possible. May interact with blood thinners.',
    recommendedFor: ['Brain health', 'Cognitive support', 'Mood support', 'Nerve health'],
    studies: [
      {
        title: 'Improving effects of the mushroom Yamabushitake on mild cognitive impairment',
        journal: 'Phytotherapy Research',
        year: 2009,
        authors: 'Mori K, et al.',
        findings: 'Lion\'s Mane supplementation significantly improved cognitive function scores in elderly subjects.',
        sampleSize: 30,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/18844328/',
        evidenceLevel: 'moderate',
        studyType: 'rct'
      }
    ]
  },
  'chaga': {
    summary: 'Chaga (Inonotus obliquus) is a medicinal mushroom rich in antioxidants and beta-glucans that support immune function and overall health.',
    keyBenefits: [
      'Powerful antioxidant properties',
      'Supports immune function',
      'May support healthy inflammation response',
      'Rich in beta-glucans'
    ],
    safetyProfile: 'Generally safe. May lower blood sugar and blood pressure. Avoid with autoimmune conditions.',
    recommendedFor: ['Immune support', 'Antioxidant protection', 'General wellness', 'Inflammation'],
    studies: [
      {
        title: 'Immunomodulatory Activity of the Water Extract from Medicinal Mushroom Inonotus obliquus',
        journal: 'Mycobiology',
        year: 2005,
        authors: 'Kim YR',
        findings: 'Chaga extract demonstrated significant immune-enhancing activity and antioxidant properties.',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/24049587/',
        evidenceLevel: 'moderate',
        studyType: 'review'
      }
    ]
  },
  'rhodiola': {
    summary: 'Rhodiola rosea is an adaptogenic herb traditionally used to enhance physical and mental performance, reduce fatigue, and combat stress.',
    keyBenefits: [
      'Reduces mental and physical fatigue',
      'Supports stress adaptation',
      'May enhance exercise performance',
      'Supports cognitive function'
    ],
    safetyProfile: 'Generally well-tolerated. May cause dizziness or dry mouth. Avoid in bipolar disorder.',
    recommendedFor: ['Fatigue', 'Stress management', 'Athletic performance', 'Mental clarity'],
    studies: [
      {
        title: 'Rhodiola rosea: A Phytomedicinal Overview',
        journal: 'HerbalGram',
        year: 2002,
        authors: 'Brown RP, Gerbarg PL, Ramazanov Z',
        findings: 'Rhodiola demonstrated significant anti-fatigue effects and improved mental performance under stress.',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/12725561/',
        evidenceLevel: 'moderate',
        studyType: 'review'
      }
    ]
  },
  'ginkgo biloba': {
    summary: 'Ginkgo biloba is one of the oldest living tree species. Its leaf extract supports cognitive function and circulation.',
    keyBenefits: [
      'Supports cognitive function and memory',
      'Improves blood circulation',
      'Antioxidant properties',
      'May support eye health'
    ],
    safetyProfile: 'Generally safe. May increase bleeding risk. Interactions with blood thinners and some medications.',
    recommendedFor: ['Cognitive support', 'Memory', 'Circulation', 'Eye health'],
    studies: [
      {
        title: 'Ginkgo biloba for cognitive impairment and dementia',
        journal: 'Cochrane Database of Systematic Reviews',
        year: 2009,
        authors: 'Birks J, Grimley Evans J',
        findings: 'Ginkgo appears safe with some evidence of cognitive benefit, especially at doses above 200mg.',
        sampleSize: 3000,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/19160216/',
        evidenceLevel: 'moderate',
        studyType: 'meta_analysis'
      }
    ]
  },
  'maca': {
    summary: 'Maca (Lepidium meyenii) is a Peruvian root vegetable traditionally used to enhance energy, stamina, and reproductive health.',
    keyBenefits: [
      'Supports energy and stamina',
      'May enhance libido',
      'Supports hormonal balance',
      'May improve mood and reduce anxiety'
    ],
    safetyProfile: 'Generally very safe. Start with lower doses. May affect thyroid in some individuals.',
    recommendedFor: ['Energy support', 'Libido', 'Hormonal balance', 'Athletic performance'],
    studies: [
      {
        title: 'Effect of Lepidium meyenii (MACA) on sexual desire',
        journal: 'Andrologia',
        year: 2002,
        authors: 'Gonzales GF, et al.',
        findings: 'Maca improved sexual desire after 8 weeks of treatment independent of testosterone levels.',
        sampleSize: 57,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/12472620/',
        evidenceLevel: 'moderate',
        studyType: 'rct'
      }
    ]
  },
  'boswellia': {
    summary: 'Boswellia (Indian Frankincense) contains boswellic acids that have powerful anti-inflammatory properties, particularly for joint health.',
    keyBenefits: [
      'Supports joint health and mobility',
      'Anti-inflammatory properties',
      'May reduce arthritis symptoms',
      'Supports respiratory health'
    ],
    safetyProfile: 'Generally well-tolerated. May cause GI upset in some. Avoid during pregnancy.',
    recommendedFor: ['Joint health', 'Arthritis', 'Inflammation', 'Respiratory health'],
    studies: [
      {
        title: 'Efficacy and tolerability of Boswellia serrata extract in treatment of osteoarthritis of knee',
        journal: 'Phytomedicine',
        year: 2003,
        authors: 'Kimmatkar N, et al.',
        findings: 'Boswellia extract significantly improved knee pain, swelling, and function within 8 weeks.',
        sampleSize: 30,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/12622457/',
        evidenceLevel: 'moderate',
        studyType: 'rct'
      }
    ]
  },
  'quercetin': {
    summary: 'Quercetin is a plant flavonoid with powerful antioxidant and anti-inflammatory properties found in many fruits and vegetables.',
    keyBenefits: [
      'Powerful antioxidant',
      'Supports immune function',
      'Anti-inflammatory effects',
      'May reduce allergy symptoms'
    ],
    safetyProfile: 'Generally very safe. May interact with some antibiotics. Well-tolerated at standard doses.',
    recommendedFor: ['Immune support', 'Allergies', 'Inflammation', 'Antioxidant protection'],
    studies: [
      {
        title: 'Quercetin reduces illness but not immune perturbations after intensive exercise',
        journal: 'Medicine & Science in Sports & Exercise',
        year: 2007,
        authors: 'Nieman DC, et al.',
        findings: 'Quercetin supplementation significantly reduced upper respiratory illness following intense exercise.',
        sampleSize: 1002,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/17762356/',
        evidenceLevel: 'strong',
        studyType: 'rct'
      }
    ]
  },
  'alpha lipoic acid': {
    summary: 'Alpha-lipoic acid (ALA) is a potent antioxidant that supports energy metabolism, nerve health, and helps regenerate other antioxidants.',
    keyBenefits: [
      'Powerful antioxidant (both water and fat soluble)',
      'Supports nerve health',
      'May help with blood sugar regulation',
      'Regenerates vitamins C and E'
    ],
    safetyProfile: 'Generally safe. May lower blood sugar. Start with lower doses to assess tolerance.',
    recommendedFor: ['Antioxidant support', 'Nerve health', 'Blood sugar support', 'Diabetic neuropathy'],
    studies: [
      {
        title: 'Treatment of symptomatic diabetic polyneuropathy with alpha-lipoic acid',
        journal: 'Diabetes Care',
        year: 2006,
        authors: 'Ziegler D, et al.',
        findings: 'Alpha-lipoic acid significantly improved neuropathic symptoms and deficits in diabetic patients.',
        sampleSize: 181,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/17065669/',
        evidenceLevel: 'strong',
        studyType: 'rct'
      }
    ]
  },
  'resveratrol': {
    summary: 'Resveratrol is a polyphenol found in red wine, grapes, and berries with potential anti-aging and cardiovascular benefits.',
    keyBenefits: [
      'Antioxidant and anti-inflammatory',
      'May support cardiovascular health',
      'Potential anti-aging effects',
      'Supports brain health'
    ],
    safetyProfile: 'Generally safe at moderate doses. High doses may cause GI upset. May interact with blood thinners.',
    recommendedFor: ['Cardiovascular health', 'Anti-aging', 'Brain health', 'Antioxidant support'],
    studies: [
      {
        title: 'Effects of Resveratrol on Memory Performance, Hippocampal Functional Connectivity, and Glucose Metabolism in Healthy Older Adults',
        journal: 'Journal of Neuroscience',
        year: 2014,
        authors: 'Witte AV, et al.',
        findings: 'Resveratrol supplementation improved memory performance and hippocampal connectivity in older adults.',
        sampleSize: 46,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/24899709/',
        evidenceLevel: 'moderate',
        studyType: 'rct'
      }
    ]
  },
  'n-acetyl cysteine': {
    summary: 'N-Acetyl Cysteine (NAC) is a precursor to glutathione, the body\'s master antioxidant. It supports detoxification, respiratory health, and mental wellness.',
    keyBenefits: [
      'Supports glutathione production',
      'Aids detoxification',
      'Supports respiratory health',
      'May improve mental health'
    ],
    safetyProfile: 'Generally safe. May cause GI upset. Has a sulfur smell. Medical supervision recommended for mental health use.',
    recommendedFor: ['Detoxification', 'Respiratory health', 'Liver support', 'Mental wellness'],
    studies: [
      {
        title: 'N-acetylcysteine in psychiatry: current therapeutic evidence and potential mechanisms of action',
        journal: 'Journal of Psychiatry & Neuroscience',
        year: 2011,
        authors: 'Dean O, Giorlando F, Berk M',
        findings: 'NAC showed promise in treating addiction, compulsive disorders, schizophrenia, and bipolar depression.',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/21118657/',
        evidenceLevel: 'moderate',
        studyType: 'review'
      }
    ]
  },
  'astragalus': {
    summary: 'Astragalus is a traditional Chinese herb used for centuries to support immune function, energy, and longevity.',
    keyBenefits: [
      'Supports immune function',
      'Adaptogenic properties',
      'May support heart health',
      'Traditional longevity herb'
    ],
    safetyProfile: 'Generally safe. May interact with immunosuppressants. Avoid in acute infections.',
    recommendedFor: ['Immune support', 'Energy', 'Longevity', 'Stress adaptation'],
    studies: [
      {
        title: 'Astragalus membranaceus in the Prevention of Upper Respiratory Tract Infections',
        journal: 'Phytomedicine',
        year: 2014,
        authors: 'Liu P, et al.',
        findings: 'Astragalus demonstrated significant immunomodulating effects and reduced respiratory infections.',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/24877671/',
        evidenceLevel: 'moderate',
        studyType: 'review'
      }
    ]
  },
  'elderberry': {
    summary: 'Elderberry (Sambucus nigra) is rich in antioxidants and has been traditionally used to support immune function and fight respiratory infections.',
    keyBenefits: [
      'Supports immune system',
      'May reduce cold and flu duration',
      'Rich in antioxidants',
      'Anti-viral properties'
    ],
    safetyProfile: 'Safe when properly prepared. Raw elderberry is toxic. Standardized extracts are safe.',
    recommendedFor: ['Immune support', 'Cold and flu', 'Antioxidant support', 'Respiratory health'],
    studies: [
      {
        title: 'Elderberry Supplementation Reduces Cold Duration and Symptoms',
        journal: 'Nutrients',
        year: 2016,
        authors: 'Tiralongo E, Wee SS, Lea RA',
        findings: 'Elderberry supplementation substantially reduced cold duration and severity in air travelers.',
        sampleSize: 312,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/26923064/',
        evidenceLevel: 'strong',
        studyType: 'rct'
      }
    ]
  },
  'cordyceps': {
    summary: 'Cordyceps is a medicinal mushroom traditionally used to enhance energy, athletic performance, and respiratory function.',
    keyBenefits: [
      'Supports energy and stamina',
      'May enhance athletic performance',
      'Supports respiratory health',
      'Adaptogenic properties'
    ],
    safetyProfile: 'Generally safe. May interact with blood thinners and immunosuppressants.',
    recommendedFor: ['Energy', 'Athletic performance', 'Respiratory health', 'Immune support'],
    studies: [
      {
        title: 'Effect of Cs-4 (Cordyceps sinensis) on Exercise Performance in Healthy Older Subjects',
        journal: 'Journal of Alternative and Complementary Medicine',
        year: 2010,
        authors: 'Chen S, et al.',
        findings: 'Cordyceps supplementation improved maximal oxygen consumption and ventilatory threshold in elderly.',
        sampleSize: 20,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/20804368/',
        evidenceLevel: 'moderate',
        studyType: 'rct'
      }
    ]
  },
  'collagen': {
    summary: 'Collagen is the most abundant protein in the body, essential for skin, joint, and connective tissue health. Supplementation supports skin elasticity and joint function.',
    keyBenefits: [
      'Supports skin elasticity and hydration',
      'May reduce joint pain',
      'Supports bone health',
      'Promotes gut health'
    ],
    safetyProfile: 'Very safe. Derived from animal sources. Minimal side effects reported.',
    recommendedFor: ['Skin health', 'Joint support', 'Bone health', 'Gut health'],
    studies: [
      {
        title: 'Oral supplementation of specific collagen peptides has beneficial effects on human skin physiology',
        journal: 'Skin Pharmacology and Physiology',
        year: 2014,
        authors: 'Proksch E, et al.',
        findings: 'Collagen peptide supplementation improved skin elasticity, moisture, and reduced wrinkles.',
        sampleSize: 69,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/23949208/',
        evidenceLevel: 'strong',
        studyType: 'rct'
      }
    ]
  },
  'phosphatidylcholine': {
    summary: 'Phosphatidylcholine is a major component of cell membranes and a precursor to the neurotransmitter acetylcholine. Research supports its role in liver health, cognitive function, and fat metabolism.',
    keyBenefits: [
      'Supports brain function and memory',
      'Aids liver health and fat metabolism',
      'Maintains healthy cell membranes',
      'Supports acetylcholine production'
    ],
    safetyProfile: 'Generally well-tolerated. May cause GI upset at high doses. Derived from soy or sunflower lecithin.',
    recommendedFor: ['Cognitive support', 'Liver health', 'Cell membrane integrity', 'Fat metabolism'],
    studies: [
      {
        title: 'Phosphatidylcholine and memory: A systematic review',
        journal: 'Clinical Interventions in Aging',
        year: 2015,
        authors: 'Lopes da Silva S, et al.',
        findings: 'Phosphatidylcholine supplementation showed improvements in memory and cognitive function, particularly in older adults.',
        sampleSize: 485,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/26124654/',
        evidenceLevel: 'moderate',
        studyType: 'systematic_review'
      },
      {
        title: 'Polyenylphosphatidylcholine in alcoholic liver disease',
        journal: 'Alcoholism: Clinical and Experimental Research',
        year: 2000,
        authors: 'Lieber CS, et al.',
        findings: 'Phosphatidylcholine demonstrated hepatoprotective effects and supported liver regeneration in patients with liver disease.',
        sampleSize: 789,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/10924277/',
        evidenceLevel: 'strong',
        studyType: 'rct'
      }
    ]
  },
  'gaba': {
    summary: 'GABA (gamma-aminobutyric acid) is the primary inhibitory neurotransmitter in the brain. It plays a crucial role in reducing neuronal excitability and promoting relaxation and calm.',
    keyBenefits: [
      'Promotes relaxation and reduces stress',
      'May improve sleep quality',
      'Helps reduce anxiety symptoms',
      'Supports calm mental state'
    ],
    safetyProfile: 'Generally safe. May cause drowsiness. Not recommended with sedative medications.',
    recommendedFor: ['Stress relief', 'Sleep support', 'Anxiety management', 'Relaxation'],
    studies: [
      {
        title: 'GABA and l-theanine mixture decreases sleep latency and improves NREM sleep',
        journal: 'Pharmaceutical Biology',
        year: 2019,
        authors: 'Kim S, et al.',
        findings: 'GABA supplementation significantly reduced time to fall asleep and improved sleep quality.',
        sampleSize: 40,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/31062640/',
        evidenceLevel: 'moderate',
        studyType: 'rct'
      },
      {
        title: 'Effect of GABA supplementation on stress and sleep',
        journal: 'Biofactors',
        year: 2006,
        authors: 'Abdou AM, et al.',
        findings: 'GABA administration showed significant stress-reducing effects and improved relaxation markers.',
        sampleSize: 63,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/17143743/',
        evidenceLevel: 'moderate',
        studyType: 'rct'
      }
    ]
  },
  'l-theanine': {
    summary: 'L-Theanine is an amino acid found primarily in tea leaves. It promotes relaxation without drowsiness and may enhance focus and cognitive performance, especially when combined with caffeine.',
    keyBenefits: [
      'Promotes relaxation without sedation',
      'Enhances focus and attention',
      'May reduce stress and anxiety',
      'Supports cognitive function'
    ],
    safetyProfile: 'Very safe with no significant side effects. Can be taken with caffeine for synergistic effects.',
    recommendedFor: ['Focus enhancement', 'Stress reduction', 'Cognitive support', 'Relaxation'],
    studies: [
      {
        title: 'L-theanine, a natural constituent in tea, and its effect on mental state',
        journal: 'Asia Pacific Journal of Clinical Nutrition',
        year: 2008,
        authors: 'Nobre AC, Rao A, Owen GN',
        findings: 'L-theanine promotes alpha brain wave activity associated with relaxation and improved attention.',
        sampleSize: 35,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/18296328/',
        evidenceLevel: 'moderate',
        studyType: 'rct'
      },
      {
        title: 'The combination of L-theanine and caffeine improves cognitive performance and increases subjective alertness',
        journal: 'Nutritional Neuroscience',
        year: 2010,
        authors: 'Owen GN, et al.',
        findings: 'L-theanine combined with caffeine improved accuracy and speed of attention-switching tasks.',
        sampleSize: 48,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/18681988/',
        evidenceLevel: 'strong',
        studyType: 'rct'
      }
    ]
  },
  'vitamin e': {
    summary: 'Vitamin E is a fat-soluble antioxidant that protects cells from oxidative damage. It supports skin health, immune function, and cardiovascular health.',
    keyBenefits: [
      'Powerful antioxidant protection',
      'Supports skin health',
      'Enhances immune function',
      'May support cardiovascular health'
    ],
    safetyProfile: 'Safe at recommended doses. High doses may increase bleeding risk. Avoid with blood thinners.',
    recommendedFor: ['Antioxidant support', 'Skin health', 'Immune function', 'Heart health'],
    studies: [
      {
        title: 'Vitamin E in the treatment of cardiovascular disease',
        journal: 'Journal of the American College of Cardiology',
        year: 2001,
        authors: 'Pryor WA',
        findings: 'Vitamin E showed protective effects against LDL oxidation and supported cardiovascular function.',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/11401930/',
        evidenceLevel: 'moderate',
        studyType: 'review'
      },
      {
        title: 'Vitamin E and skin health',
        journal: 'Molecular Aspects of Medicine',
        year: 2007,
        authors: 'Thiele JJ, et al.',
        findings: 'Vitamin E protects skin from UV-induced damage and supports skin barrier function.',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/17950381/',
        evidenceLevel: 'strong',
        studyType: 'review'
      }
    ]
  },
  'glutathione': {
    summary: 'Glutathione is the body\'s master antioxidant, crucial for detoxification, immune function, and cellular health. It helps neutralize free radicals and supports liver function.',
    keyBenefits: [
      'Master antioxidant for cellular protection',
      'Supports liver detoxification',
      'Enhances immune function',
      'Regenerates other antioxidants'
    ],
    safetyProfile: 'Very safe. Oral absorption is limited; liposomal forms may be better absorbed.',
    recommendedFor: ['Detoxification', 'Immune support', 'Antioxidant protection', 'Liver health'],
    studies: [
      {
        title: 'Oral supplementation with liposomal glutathione elevates body stores of glutathione and markers of immune function',
        journal: 'European Journal of Clinical Nutrition',
        year: 2015,
        authors: 'Sinha R, et al.',
        findings: 'Liposomal glutathione supplementation significantly increased blood glutathione levels and improved immune markers.',
        sampleSize: 54,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/25226822/',
        evidenceLevel: 'moderate',
        studyType: 'rct'
      }
    ]
  },
  'nad+': {
    summary: 'NAD+ (Nicotinamide Adenine Dinucleotide) is a coenzyme essential for energy metabolism and cellular repair. Levels decline with age, making supplementation relevant for longevity.',
    keyBenefits: [
      'Supports cellular energy production',
      'Promotes DNA repair mechanisms',
      'May support healthy aging',
      'Enhances mitochondrial function'
    ],
    safetyProfile: 'Generally safe. Limited long-term human data. Precursors like NMN or NR may be more effective orally.',
    recommendedFor: ['Anti-aging', 'Energy support', 'Cellular health', 'Longevity'],
    studies: [
      {
        title: 'NAD+ metabolism and its roles in cellular processes during ageing',
        journal: 'Nature Reviews Molecular Cell Biology',
        year: 2021,
        authors: 'Covarrubias AJ, et al.',
        findings: 'NAD+ decline is a hallmark of aging; boosting NAD+ levels shows promise for improving healthspan.',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/33353981/',
        evidenceLevel: 'strong',
        studyType: 'review'
      }
    ]
  },
  'nmn': {
    summary: 'NMN (Nicotinamide Mononucleotide) is a direct precursor to NAD+. Research shows it can effectively raise NAD+ levels and may support metabolic health and longevity.',
    keyBenefits: [
      'Boosts NAD+ levels effectively',
      'Supports energy metabolism',
      'May improve insulin sensitivity',
      'Promotes healthy aging'
    ],
    safetyProfile: 'Well-tolerated in human studies. Long-term safety data still emerging.',
    recommendedFor: ['Anti-aging', 'Metabolic health', 'Energy support', 'Longevity'],
    studies: [
      {
        title: 'Effect of oral administration of nicotinamide mononucleotide on clinical parameters and nicotinamide metabolite levels in healthy Japanese men',
        journal: 'Endocrine Journal',
        year: 2020,
        authors: 'Irie J, et al.',
        findings: 'NMN supplementation safely increased NAD+ metabolites in blood without adverse effects.',
        sampleSize: 10,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/31685720/',
        evidenceLevel: 'preliminary',
        studyType: 'rct'
      }
    ]
  },
  'hawthorn berry': {
    summary: 'Hawthorn berry is traditionally used for cardiovascular support. Research supports its use for improving blood flow, supporting heart function, and managing mild heart conditions.',
    keyBenefits: [
      'Supports cardiovascular health',
      'May improve blood flow',
      'Rich in antioxidants',
      'May help manage blood pressure'
    ],
    safetyProfile: 'Generally safe. May interact with heart medications. Consult healthcare provider if on cardiac drugs.',
    recommendedFor: ['Heart health', 'Blood pressure support', 'Circulation', 'Antioxidant support'],
    studies: [
      {
        title: 'Hawthorn extract for treating chronic heart failure',
        journal: 'Cochrane Database of Systematic Reviews',
        year: 2008,
        authors: 'Pittler MH, Guo R, Ernst E',
        findings: 'Hawthorn extract significantly improved symptoms and exercise tolerance in patients with chronic heart failure.',
        sampleSize: 855,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/18254076/',
        evidenceLevel: 'strong',
        studyType: 'meta_analysis'
      }
    ]
  },
  'graviola': {
    summary: 'Graviola (soursop) is a tropical fruit with traditional medicinal uses. Research is exploring its antioxidant properties and potential anti-cancer effects, though human data is limited.',
    keyBenefits: [
      'Rich in antioxidants',
      'May support immune function',
      'Anti-inflammatory properties',
      'Traditional use for infections'
    ],
    safetyProfile: 'Limited safety data. High consumption may affect nervous system. Use caution with long-term use.',
    recommendedFor: ['Immune support', 'Antioxidant protection', 'Traditional wellness'],
    studies: [
      {
        title: 'Graviola: A systematic review on its anticancer properties',
        journal: 'BMC Complementary and Alternative Medicine',
        year: 2018,
        authors: 'Rady I, et al.',
        findings: 'In vitro studies show graviola extracts have cytotoxic effects on cancer cells, though human clinical trials are needed.',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/30373594/',
        evidenceLevel: 'preliminary',
        studyType: 'systematic_review'
      }
    ]
  },
  'garlic': {
    summary: 'Garlic has been used medicinally for thousands of years. Modern research supports its cardiovascular benefits, including effects on blood pressure and cholesterol levels.',
    keyBenefits: [
      'Supports healthy blood pressure',
      'May reduce cholesterol levels',
      'Immune-boosting properties',
      'Antimicrobial effects'
    ],
    safetyProfile: 'Very safe. May increase bleeding risk. Garlic breath is common. May interact with blood thinners.',
    recommendedFor: ['Heart health', 'Blood pressure support', 'Immune function', 'Cholesterol management'],
    studies: [
      {
        title: 'Effect of garlic on serum lipids: an updated meta-analysis',
        journal: 'Nutrition Reviews',
        year: 2013,
        authors: 'Ried K, Toben C, Fakler P',
        findings: 'Garlic supplementation reduced total cholesterol by 17-30 mg/dL in studies lasting more than 2 months.',
        sampleSize: 2300,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/23590705/',
        evidenceLevel: 'strong',
        studyType: 'meta_analysis'
      }
    ]
  },
  'ginger': {
    summary: 'Ginger is a versatile root with potent anti-inflammatory and digestive benefits. Research supports its use for nausea, muscle pain, and metabolic health.',
    keyBenefits: [
      'Powerful anti-nausea effects',
      'Anti-inflammatory properties',
      'Supports digestive health',
      'May reduce muscle soreness'
    ],
    safetyProfile: 'Very safe. May cause mild GI upset in sensitive individuals. May interact with blood thinners.',
    recommendedFor: ['Digestive support', 'Nausea relief', 'Inflammation', 'Muscle recovery'],
    studies: [
      {
        title: 'Ginger in gastrointestinal disorders: A systematic review of clinical trials',
        journal: 'Food Science & Nutrition',
        year: 2019,
        authors: 'Nikkhah Bodagh M, et al.',
        findings: 'Ginger effectively reduced nausea and improved digestive function across multiple clinical trials.',
        sampleSize: 1200,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/30680163/',
        evidenceLevel: 'strong',
        studyType: 'systematic_review'
      }
    ]
  },
  'lutein': {
    summary: 'Lutein is a carotenoid antioxidant concentrated in the eyes. It protects against blue light damage and age-related macular degeneration, supporting long-term eye health.',
    keyBenefits: [
      'Protects eyes from blue light',
      'Supports macular health',
      'May reduce cataract risk',
      'Antioxidant for eye tissues'
    ],
    safetyProfile: 'Very safe. No significant side effects at recommended doses.',
    recommendedFor: ['Eye health', 'Macular support', 'Blue light protection', 'Vision preservation'],
    studies: [
      {
        title: 'Lutein and zeaxanthin and their potential roles in disease prevention',
        journal: 'Journal of the American College of Nutrition',
        year: 2004,
        authors: 'Krinsky NI, et al.',
        findings: 'Higher lutein intake is associated with reduced risk of age-related macular degeneration and cataracts.',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/15630208/',
        evidenceLevel: 'strong',
        studyType: 'review'
      }
    ]
  },
  'stinging nettle': {
    summary: 'Stinging nettle has traditional uses for prostate health, allergies, and inflammation. Research supports its benefits for urinary symptoms and inflammatory conditions.',
    keyBenefits: [
      'Supports prostate health',
      'May reduce allergy symptoms',
      'Anti-inflammatory effects',
      'Supports urinary function'
    ],
    safetyProfile: 'Generally safe. May cause mild GI upset. May affect blood sugar and blood pressure.',
    recommendedFor: ['Prostate health', 'Allergy support', 'Urinary health', 'Inflammation'],
    studies: [
      {
        title: 'Urtica dioica for treatment of benign prostatic hyperplasia: a prospective, randomized, double-blind, placebo-controlled, crossover study',
        journal: 'Journal of Herbal Pharmacotherapy',
        year: 2005,
        authors: 'Safarinejad MR',
        findings: 'Stinging nettle significantly improved urinary symptoms and flow rates in men with BPH.',
        sampleSize: 620,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/16093236/',
        evidenceLevel: 'strong',
        studyType: 'rct'
      }
    ]
  },
  'suma root': {
    summary: 'Suma root, known as "Brazilian ginseng," is an adaptogenic herb traditionally used for energy, immune support, and hormonal balance.',
    keyBenefits: [
      'Adaptogenic stress support',
      'May boost energy levels',
      'Supports immune function',
      'Traditional hormone support'
    ],
    safetyProfile: 'Limited safety data. Generally considered safe in traditional use. Avoid during pregnancy.',
    recommendedFor: ['Energy support', 'Adaptogenic benefits', 'Immune function', 'Vitality'],
    studies: [
      {
        title: 'Pfaffia paniculata (Brazilian ginseng) as adaptogen',
        journal: 'Journal of Ethnopharmacology',
        year: 2000,
        authors: 'Matsuda H, et al.',
        findings: 'Suma root demonstrated adaptogenic properties and enhanced physical endurance in animal studies.',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/10767472/',
        evidenceLevel: 'preliminary',
        studyType: 'review'
      }
    ]
  },
  'red ginseng': {
    summary: 'Red ginseng (Korean ginseng) is processed Panax ginseng with enhanced bioactive compounds. Research supports its benefits for energy, immune function, and cognitive performance.',
    keyBenefits: [
      'Enhances energy and reduces fatigue',
      'Supports immune function',
      'May improve cognitive function',
      'Supports blood sugar regulation'
    ],
    safetyProfile: 'Generally safe. May cause insomnia or digestive issues. Avoid with stimulants and blood thinners.',
    recommendedFor: ['Energy support', 'Immune function', 'Cognitive enhancement', 'Vitality'],
    studies: [
      {
        title: 'Effects of Korean red ginseng on cognitive and motor function',
        journal: 'Journal of Ginseng Research',
        year: 2013,
        authors: 'Lee ST, et al.',
        findings: 'Korean red ginseng improved cognitive performance and working memory in healthy adults.',
        sampleSize: 51,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/23717135/',
        evidenceLevel: 'moderate',
        studyType: 'rct'
      }
    ]
  },
  'innoslim': {
    summary: 'InnoSlim is a patented blend of Panax notoginseng and Astragalus membranaceus. Research shows it can support healthy blood sugar and metabolic function by activating AMPK.',
    keyBenefits: [
      'Supports healthy blood sugar',
      'Activates AMPK pathway',
      'May support weight management',
      'Supports metabolic health'
    ],
    safetyProfile: 'Generally safe based on clinical studies. Made from traditional botanical extracts.',
    recommendedFor: ['Blood sugar support', 'Metabolic health', 'Weight management', 'AMPK activation'],
    studies: [
      {
        title: 'Clinical efficacy of InnoSlim on glucose metabolism',
        journal: 'Journal of Functional Foods',
        year: 2016,
        authors: 'Liu S, et al.',
        findings: 'InnoSlim supplementation improved glucose tolerance and increased adiponectin levels in overweight subjects.',
        sampleSize: 96,
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/27617086/',
        evidenceLevel: 'moderate',
        studyType: 'rct'
      }
    ]
  }
};

// Normalize ingredient name for lookup
function normalizeForLookup(name: string): string {
  return name.toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get pre-built research data for an ingredient
 */
export function getIngredientResearch(ingredientName: string): IngredientResearch | null {
  const normalized = normalizeForLookup(ingredientName);
  
  // Direct match
  if (ingredientResearchData[normalized]) {
    return ingredientResearchData[normalized];
  }
  
  // Partial match
  for (const key of Object.keys(ingredientResearchData)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return ingredientResearchData[key];
    }
  }
  
  return null;
}

/**
 * Get list of all ingredients with research data
 */
export function getResearchedIngredients(): string[] {
  return Object.keys(ingredientResearchData);
}

/**
 * Check if we have research data for an ingredient
 */
export function hasResearchData(ingredientName: string): boolean {
  return getIngredientResearch(ingredientName) !== null;
}
