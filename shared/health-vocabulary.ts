/**
 * Top ~600 prescription + OTC medications by US dispensing volume.
 * Used for typeahead in the health profile so patients don't have to
 * spell drug names from memory.
 *
 * Sources: top-300 prescribed drugs lists (ClinCalc, GoodRx),
 * common OTC brands (CVS/Walgreens), and frequently-flagged
 * supplement-interaction drugs (warfarin, statins, levothyroxine, etc.).
 *
 * Format: lowercased generic names + a few well-known brand names.
 * Keep alphabetized within a section for easy maintenance.
 */
export const COMMON_MEDICATIONS: string[] = [
  // Cardiovascular
  'amlodipine', 'atenolol', 'atorvastatin', 'bisoprolol', 'carvedilol',
  'clonidine', 'clopidogrel', 'diltiazem', 'enalapril', 'eplerenone',
  'felodipine', 'furosemide', 'hydralazine', 'hydrochlorothiazide',
  'irbesartan', 'isosorbide', 'labetalol', 'lisinopril', 'losartan',
  'metoprolol', 'nebivolol', 'nifedipine', 'olmesartan', 'pravastatin',
  'prazosin', 'propranolol', 'ramipril', 'rosuvastatin', 'simvastatin',
  'spironolactone', 'telmisartan', 'torsemide', 'valsartan', 'verapamil',
  'warfarin', 'apixaban (eliquis)', 'rivaroxaban (xarelto)',
  'dabigatran (pradaxa)', 'aspirin (low-dose)',

  // Diabetes / metabolic
  'metformin', 'glipizide', 'glyburide', 'glimepiride', 'pioglitazone',
  'sitagliptin (januvia)', 'linagliptin (tradjenta)', 'empagliflozin (jardiance)',
  'dapagliflozin (farxiga)', 'canagliflozin (invokana)',
  'semaglutide (ozempic)', 'semaglutide (wegovy)', 'tirzepatide (mounjaro)',
  'tirzepatide (zepbound)', 'liraglutide (victoza)', 'dulaglutide (trulicity)',
  'insulin glargine (lantus)', 'insulin lispro (humalog)',
  'insulin aspart (novolog)', 'insulin detemir (levemir)',

  // Thyroid
  'levothyroxine (synthroid)', 'levothyroxine', 'liothyronine (cytomel)',
  'np thyroid', 'armour thyroid', 'wp thyroid', 'methimazole', 'propylthiouracil',

  // Mental health / sleep
  'alprazolam (xanax)', 'amitriptyline', 'aripiprazole (abilify)',
  'bupropion (wellbutrin)', 'buspirone', 'citalopram (celexa)',
  'clonazepam (klonopin)', 'desvenlafaxine (pristiq)', 'diazepam (valium)',
  'doxepin', 'duloxetine (cymbalta)', 'escitalopram (lexapro)',
  'fluoxetine (prozac)', 'gabapentin', 'hydroxyzine', 'lamotrigine',
  'lithium', 'lorazepam (ativan)', 'mirtazapine', 'nortriptyline',
  'olanzapine', 'paroxetine (paxil)', 'pregabalin (lyrica)',
  'quetiapine (seroquel)', 'risperidone', 'sertraline (zoloft)',
  'temazepam', 'trazodone', 'venlafaxine (effexor)', 'vilazodone',
  'vortioxetine (trintellix)', 'zolpidem (ambien)', 'eszopiclone (lunesta)',
  'melatonin',

  // ADHD / stimulants
  'adderall (amphetamine/dextroamphetamine)', 'vyvanse (lisdexamfetamine)',
  'methylphenidate (ritalin)', 'methylphenidate (concerta)',
  'atomoxetine (strattera)', 'guanfacine', 'clonidine (kapvay)',
  'modafinil', 'armodafinil',

  // Pain / anti-inflammatory
  'acetaminophen (tylenol)', 'ibuprofen (advil, motrin)', 'naproxen (aleve)',
  'celecoxib (celebrex)', 'meloxicam', 'diclofenac', 'indomethacin',
  'ketorolac', 'tramadol', 'oxycodone', 'hydrocodone/acetaminophen (norco, vicodin)',
  'morphine', 'codeine', 'fentanyl', 'methadone', 'buprenorphine',
  'cyclobenzaprine (flexeril)', 'methocarbamol', 'tizanidine',
  'baclofen', 'carisoprodol (soma)',

  // GI
  'omeprazole (prilosec)', 'pantoprazole (protonix)', 'esomeprazole (nexium)',
  'lansoprazole (prevacid)', 'famotidine (pepcid)', 'ranitidine',
  'sucralfate', 'ondansetron (zofran)', 'promethazine', 'metoclopramide',
  'dicyclomine', 'hyoscyamine', 'loperamide (imodium)',
  'bisacodyl (dulcolax)', 'docusate', 'polyethylene glycol (miralax)',
  'lactulose', 'linaclotide (linzess)', 'mesalamine', 'rifaximin (xifaxan)',

  // Respiratory / allergy
  'albuterol', 'budesonide', 'budesonide/formoterol (symbicort)',
  'fluticasone (flovent)', 'fluticasone/salmeterol (advair)',
  'mometasone', 'tiotropium (spiriva)', 'montelukast (singulair)',
  'cetirizine (zyrtec)', 'loratadine (claritin)', 'fexofenadine (allegra)',
  'diphenhydramine (benadryl)', 'levocetirizine (xyzal)',
  'azelastine', 'fluticasone nasal (flonase)', 'pseudoephedrine',

  // Antibiotics / antimicrobials
  'amoxicillin', 'amoxicillin/clavulanate (augmentin)', 'azithromycin (z-pak)',
  'cephalexin (keflex)', 'cefdinir', 'ciprofloxacin', 'clindamycin',
  'doxycycline', 'erythromycin', 'levofloxacin', 'metronidazole (flagyl)',
  'nitrofurantoin (macrobid)', 'penicillin', 'sulfamethoxazole/trimethoprim (bactrim)',
  'tetracycline', 'fluconazole (diflucan)', 'acyclovir', 'valacyclovir (valtrex)',
  'oseltamivir (tamiflu)',

  // Hormonal / reproductive
  'estradiol', 'estrogen (premarin)', 'progesterone',
  'medroxyprogesterone (depo-provera)', 'oral contraceptive',
  'norethindrone', 'levonorgestrel', 'drospirenone/ethinyl estradiol',
  'norgestimate/ethinyl estradiol', 'finasteride (propecia, proscar)',
  'dutasteride (avodart)', 'tamsulosin (flomax)', 'tadalafil (cialis)',
  'sildenafil (viagra)', 'testosterone (cypionate, enanthate, gel)',
  'clomiphene', 'spironolactone (for acne/pcos)',

  // Neuro / migraine / seizure
  'topiramate (topamax)', 'valproic acid (depakote)', 'carbamazepine (tegretol)',
  'oxcarbazepine (trileptal)', 'levetiracetam (keppra)', 'phenytoin (dilantin)',
  'sumatriptan (imitrex)', 'rizatriptan', 'eletriptan',
  'erenumab (aimovig)', 'galcanezumab (emgality)', 'fremanezumab (ajovy)',
  'donepezil (aricept)', 'memantine (namenda)', 'levodopa/carbidopa (sinemet)',
  'pramipexole', 'ropinirole', 'rasagiline',

  // Autoimmune / immunosuppressants / biologics
  'methotrexate', 'hydroxychloroquine (plaquenil)', 'sulfasalazine',
  'prednisone', 'prednisolone', 'methylprednisolone', 'dexamethasone',
  'azathioprine', 'mycophenolate', 'cyclosporine', 'tacrolimus',
  'adalimumab (humira)', 'etanercept (enbrel)', 'infliximab (remicade)',
  'rituximab', 'ustekinumab (stelara)', 'secukinumab (cosentyx)',
  'dupilumab (dupixent)', 'ocrelizumab', 'tofacitinib (xeljanz)',

  // Other common
  'allopurinol', 'colchicine', 'febuxostat',
  'tamsulosin', 'oxybutynin', 'mirabegron',
  'finasteride', 'minoxidil',
  'isotretinoin (accutane)', 'tretinoin', 'adapalene',
  'levonorgestrel iud (mirena)', 'etonogestrel implant (nexplanon)',

  // Common supplements / OTC commonly listed as "medications"
  'nad+', 'nad', 'nicotinamide riboside', 'nmn',
  'creatine', 'glutathione', 'coq10', 'fish oil', 'vitamin d3',
  'b complex', 'magnesium', 'zinc', 'iron', 'probiotic',
];

/**
 * Top supplements / vitamins commonly listed by patients.
 * (Used in addition to the ALL_INGREDIENTS catalog from shared/ingredients.ts)
 */
export const COMMON_SUPPLEMENTS: string[] = [
  'vitamin a', 'vitamin b1 (thiamine)', 'vitamin b2 (riboflavin)',
  'vitamin b3 (niacin)', 'vitamin b5 (pantothenic acid)',
  'vitamin b6', 'vitamin b7 (biotin)', 'vitamin b9 (folate)',
  'vitamin b12 (methylcobalamin)', 'vitamin b complex',
  'vitamin c', 'vitamin d3', 'vitamin e', 'vitamin k2',
  'multivitamin', 'prenatal vitamin',
  'magnesium', 'magnesium glycinate', 'magnesium citrate',
  'magnesium oxide', 'magnesium l-threonate', 'magnesium malate',
  'calcium', 'calcium citrate', 'iron (ferrous bisglycinate)',
  'iron (ferrous sulfate)', 'zinc', 'zinc picolinate', 'copper',
  'selenium', 'iodine', 'chromium', 'manganese', 'molybdenum',
  'fish oil', 'omega-3 (epa/dha)', 'krill oil', 'algae oil', 'cod liver oil',
  'coq10', 'ubiquinol', 'pqq', 'alpha lipoic acid (ala)',
  'n-acetyl cysteine (nac)', 'glutathione', 'l-glutamine',
  'l-theanine', 'l-tyrosine', 'l-arginine', 'l-citrulline',
  'l-carnitine', 'acetyl-l-carnitine',
  'creatine monohydrate', 'beta alanine', 'taurine',
  'collagen peptides', 'whey protein', 'plant protein',
  'probiotic', 'prebiotic', 'digestive enzymes',
  'ashwagandha', 'rhodiola', 'reishi', "lion's mane",
  'cordyceps', 'turkey tail', 'maca', 'ginseng (panax)',
  'turmeric (curcumin)', 'boswellia', 'ginger', 'milk thistle',
  'dandelion', 'nettle', 'spirulina', 'chlorella', 'moringa',
  'berberine', 'quercetin', 'resveratrol', 'pterostilbene',
  'pycnogenol', 'astaxanthin', 'lutein', 'zeaxanthin',
  'melatonin', 'magnesium glycinate (sleep)', 'glycine',
  'gaba', '5-htp', 'tryptophan', 'phosphatidylserine',
  'lithium orotate', 'inositol',
  'nad+', 'nicotinamide riboside (nr)', 'nmn', 'nicotinamide (b3)',
  'methylene blue', 'tmg (trimethylglycine)', 'choline (alpha-gpc)',
  'choline (citicoline)', 'phosphatidylcholine',
  'serrapeptase', 'nattokinase', 'lumbrokinase',
  'cbd', 'cbg', 'cbn',
  'dhea', 'pregnenolone', '7-keto dhea',
  'sam-e', 'msm', 'glucosamine', 'chondroitin', 'hyaluronic acid',
];

/**
 * Top allergens/intolerances patients self-report.
 */
export const COMMON_ALLERGIES: string[] = [
  // Drug allergies
  'penicillin', 'amoxicillin', 'sulfa drugs', 'aspirin', 'ibuprofen (nsaids)',
  'codeine', 'morphine', 'tramadol', 'tetracycline', 'erythromycin',
  'cephalosporins', 'fluoroquinolones', 'macrolides', 'iodine (contrast dye)',
  'latex',

  // Food allergies/intolerances
  'peanuts', 'tree nuts', 'almonds', 'cashews', 'walnuts', 'pecans',
  'pistachios', 'brazil nuts', 'hazelnuts', 'macadamia nuts',
  'milk (dairy)', 'lactose', 'casein', 'whey',
  'eggs', 'soy', 'wheat', 'gluten',
  'shellfish', 'shrimp', 'crab', 'lobster', 'fish',
  'sesame', 'mustard', 'corn', 'sulfites', 'msg',
  'nightshades', 'oats', 'barley', 'rye', 'yeast',

  // Environmental
  'pollen', 'grass', 'ragweed', 'mold', 'dust mites',
  'cat dander', 'dog dander', 'bee stings', 'wasp stings',
  'fragrance', 'nickel',

  // Supplement-relevant
  'shellfish (glucosamine)', 'soy (tocopherol)', 'gelatin (capsules)',
  'magnesium stearate', 'corn (excipients)',
];

/**
 * Top health conditions patients self-report.
 */
export const COMMON_CONDITIONS: string[] = [
  // Metabolic / endocrine
  'type 2 diabetes', 'type 1 diabetes', 'prediabetes', 'insulin resistance',
  'metabolic syndrome', 'obesity', 'hypothyroidism', 'hyperthyroidism',
  "hashimoto's thyroiditis", "graves' disease", 'pcos',
  'low testosterone', 'estrogen dominance', 'perimenopause', 'menopause',
  'andropause', 'adrenal fatigue', "addison's disease", "cushing's syndrome",

  // Cardiovascular
  'hypertension (high blood pressure)', 'high cholesterol', 'high triglycerides',
  'low hdl', 'high ldl', 'atherosclerosis', 'coronary artery disease',
  'atrial fibrillation', 'heart failure', 'mitral valve prolapse',
  'post-mi', 'stroke history', 'pots', 'orthostatic hypotension',
  'varicose veins', 'dvt history',

  // GI
  'ibs', 'ibd', 'crohn\'s disease', 'ulcerative colitis', 'sibo',
  'leaky gut', 'celiac disease', 'gerd / acid reflux', 'gastritis',
  'h. pylori', 'gallstones', 'gallbladder removed', 'fatty liver (nafld)',
  'hepatitis', 'cirrhosis', 'pancreatitis', 'diverticulitis',
  'constipation (chronic)', 'diarrhea (chronic)', 'hemorrhoids',

  // Neuro / mental health
  'depression', 'anxiety', 'panic disorder', 'ptsd', 'ocd', 'bipolar',
  'adhd', 'autism', 'migraines', 'tension headaches', 'cluster headaches',
  'epilepsy', 'multiple sclerosis', "parkinson's", "alzheimer's",
  'dementia', 'stroke recovery', 'tbi / concussion', 'insomnia',
  'sleep apnea', 'restless legs syndrome',

  // Autoimmune
  'rheumatoid arthritis', 'lupus', 'psoriasis', 'psoriatic arthritis',
  'eczema', 'vitiligo', 'mctd', 'sjogrens', 'scleroderma',
  'ankylosing spondylitis', 'celiac', "hashimoto's",

  // Musculoskeletal
  'osteoarthritis', 'osteoporosis', 'osteopenia', 'fibromyalgia',
  'chronic fatigue syndrome (me/cfs)', 'lyme disease', 'long covid',
  'sciatica', 'herniated disc', 'spinal stenosis',
  'tmj', 'plantar fasciitis', 'gout',

  // Cancer
  'breast cancer (history)', 'prostate cancer (history)', 'colon cancer (history)',
  'skin cancer', 'thyroid cancer (history)', 'lymphoma', 'leukemia',
  'cancer in remission',

  // Respiratory / allergies
  'asthma', 'copd', 'chronic bronchitis', 'allergic rhinitis',
  'chronic sinusitis', 'sleep apnea',

  // Renal
  'chronic kidney disease', 'kidney stones', 'uti (recurrent)',
  'interstitial cystitis',

  // Skin / hair
  'acne', 'rosacea', 'hair loss / alopecia', 'eczema', 'psoriasis',

  // Reproductive
  'endometriosis', 'fibroids', 'pcos', 'infertility',
  'erectile dysfunction', 'bph', 'recurrent pregnancy loss',

  // Other
  'anemia (iron deficiency)', 'b12 deficiency', 'vitamin d deficiency',
  'mthfr mutation', 'apoe4 carrier',
  'mast cell activation syndrome (mcas)', 'histamine intolerance',
  'mold illness / cirs', 'eds (ehlers-danlos)',
  'mthfr (heterozygous)', 'mthfr (homozygous)',
];
