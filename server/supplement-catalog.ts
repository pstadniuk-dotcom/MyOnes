// Complete supplement catalog with base formulas and individual ingredients
// Based on Alive Innovations' exact formulations

export interface BaseFormula {
  name: string;
  systemSupported: string;
  activeIngredients: string;
  suggestedDosage: string;
  similarTo?: string;
  totalMg?: number; // Calculated from ingredients when possible
}

export interface IndividualIngredient {
  name: string;
  standardDose: string;
  drugInteractions: string[]; // "Sub for" warnings
  benefits: string;
}

export const BASE_FORMULAS: BaseFormula[] = [
  {
    name: "Adrenal Support",
    systemSupported: "Endocrine, Metabolism",
    activeIngredients: "Vitamin C (from Camu Camu Berry) 20mg, Pantothenic Acid (as Calcium Pantothenate) 50mg, Adrenal (of bovine source, not an extract) 250mg, Licorice (root) 50mg, Ginger (rhizome) 25mg, Kelp (entire plant) 25mg",
    suggestedDosage: "1x daily",
    similarTo: "Adrena Plus",
    totalMg: 420
  },
  {
    name: "Alpha Gest III",
    systemSupported: "Digestion",
    activeIngredients: "Betaine (from 650mg Betaine HCl) 496mg, Pepsin (1:10,000) 140mg",
    suggestedDosage: "1x daily",
    totalMg: 636
  },
  {
    name: "Alpha Green II",
    systemSupported: "Spleen, Lymphatic system",
    activeIngredients: "Vitamin E (as dl-alpha Tocopheryl Acetate) 75 IU, Bovine Spleen Concentrate 250mcg, Dandelion (aerial parts) 75mg, Nettle (root) 75mg",
    suggestedDosage: "1x daily",
    totalMg: 150
  },
  {
    name: "Alpha Oxyme",
    systemSupported: "Antioxidant",
    activeIngredients: "Vitamin A (as Beta-Carotene) 1500 IU, Selenium (Amino Acid Chelate) 5mcg, Superoxide Dismutase (SOD) (Supplying: Aloe Vera (leaf), Rosemary Leaf Extract, and L-Cysteine)",
    suggestedDosage: "1x daily"
  },
  {
    name: "Alpha Zyme III",
    systemSupported: "Pancreas, Nutrition",
    activeIngredients: "Magnesium (as Aspartate, Oxide) 23mg, Potassium (as Aspartate, Chloride) 23mg, Pancreatin 8X 78mg, Ox Bile 63mg, L-Lysine 63mg, Pepsin (1:10,000) 42mg, Cellulase 4 WCA, Proprietary Blend 125mg, Barley Grass 30mg, Alfalfa Grass 25mg, Celery 10mg, Parsley Herb 10mg, Spirulina 10mg, Spinach 5mg, Watercress Leaf 5mg, Policosanol (supplying 3mg Octacosanol) 5mg, Cellulase 3.78mg, Bromelain 600 GDU/mg 0.2mg",
    suggestedDosage: "1x daily",
    totalMg: 479
  },
  {
    name: "Beta Max",
    systemSupported: "Liver, Gallbladder, Pancreas",
    activeIngredients: "Calcium (as dicalcium phosphate) 220mg, Niacin (as niacinamide) 10mg, Phosphorus (as dicalcium phosphate) 164mg, Choline Bitartrate 1664mg, Inositol 160mg, Betaine HCl 76mg, Lecithin (soy) 76mg, Artichoke 50mg, Dandelion (herb) 50mg, Milk Thistle (seed) 50mg, Turmeric (root) 50mg, DL-Methionine 30mg",
    suggestedDosage: "4x daily",
    similarTo: "Beta Plus",
    totalMg: 2600
  },
  {
    name: "Br-SP Plus",
    systemSupported: "Digestion, Immune",
    activeIngredients: "Black Radish (root), Green Cabbage (leaf), Alfalfa (leaf), Pepsin (100,000 FCC), Pituitary (of bovine source, not an extract), Duodenum and Stomach (of porcine source, not an extract)",
    suggestedDosage: "1x daily"
  },
  {
    name: "C Boost",
    systemSupported: "Soft tissue, Capillaries",
    activeIngredients: "Vitamin C (as Ascorbic Acid) 80mg, Citrus bioflavonoid Complex 1100mg, Camu Camu Berry extract 500mg",
    suggestedDosage: "3x daily",
    similarTo: "Alpha Flavin",
    totalMg: 1680
  },
  {
    name: "Circu Plus",
    systemSupported: "Circulation",
    activeIngredients: "Calcium (as Calcium Carbonate) 20mg, Ginkgo Biloba (leaf) 166mg, Siberian Ginseng (root) 166mg, Butcher's Broom (root) 166mg, Pancreatin (8X) 25mg",
    suggestedDosage: "1x daily",
    totalMg: 543
  },
  {
    name: "Colostrum Powder",
    systemSupported: "Immune, growth and tissue repair factors",
    activeIngredients: "Colostrum powder",
    suggestedDosage: "1000mg daily dose",
    totalMg: 1000
  },
  {
    name: "Chola Plus",
    systemSupported: "Stomach, Liver, Gallbladder, Pancreas",
    activeIngredients: "Niacin 0.4mg, Chromium (as Polynicotinate) 40mg, Lecithin (from soy) 100mg, Flax seed 100mg, Pancreatin (8X) 40mg, Choline Bitartrate 50mg, Ginkgo Biloba (leaf) 17mg, Eleuthero (root) 17mg, Butcher's Broom 17mg, Inositol 6mg, Sage (leaf) 4mg, DL-Methionine 2mg, Betaine HCL 2mg, Artichoke (leaf) 2mg, Dandelion (leaf) 2mg, Milk Thistle (seed) 2mg, Turmeric (root) 2mg, Bromelain 2mg",
    suggestedDosage: "1x daily",
    totalMg: 407
  },
  {
    name: "Dia Zyme",
    systemSupported: "Digestion, Pancreas",
    activeIngredients: "Calcium (as Dicalcium Phosphate) 25mg, Phosphorus (as Dicalcium Phosphate) 19mg, Pancreatin (8X) 420mcg, Trypsin 30mg, Chymotrypsin 30mcg",
    suggestedDosage: "1x daily",
    totalMg: 74
  },
  {
    name: "Diadren Forte",
    systemSupported: "Liver, Gall Bladder, Pancreas, Adrenal Glands",
    activeIngredients: "Vitamin C (Ascorbic Acid) 25mg, Niacin (as Niacinamide) 0.5mg, Pantothenic Acid (as Pantothenate) 25mg, Chromium (as Chromium GTF) 50mcg, Pancreatin (8X) Supplying: Amylase 2,500 USP, Protease 2,500 USP, Lipase 200 USP; Adrenal (of bovine, not extract) 50mg, Licorice (root) 25mg, Ginger (rhizome) 12.5mg, Choline 10mg, Inositol 7.5mg, Lecithin granules (soy) 5mg, Sage (leaf & stem) 5mg, L-Methionine 2.5mg, Betaine (from 2.5mg Betaine HCl) 2mg, Dandelion (leaf) 2.5mg, Turmeric (rhizome) 2.5mg, Milk Thistle (herb) 2.5mg, Artichoke (leaf) 2.5mg, Pancreatin (4X) USP 100mg, Bromelain 2.5mcu, Sea Kelp (entire plant) 12.5mcg",
    suggestedDosage: "1x daily"
  },
  {
    name: "Endocrine Support",
    systemSupported: "Endocrine (female)",
    activeIngredients: "Pantothenic Acid (as Ca Pantothenate) 4.5mg, Zinc (as Amino Acid Chelate) 5.3mg, Manganese (as Sulfate) 1.8mg, Ovary & Adrenal Of a bovine source-not an extract, Goldenseal (leaf), Kelp (entire plant), Pituitary, Hypothalamus, Dulse, Yarrow Flower",
    suggestedDosage: "1x daily",
    similarTo: "Endo Glan Plus"
  },
  {
    name: "Heart Support",
    systemSupported: "Heart",
    activeIngredients: "Magnesium (from Magnesium Amino Acid Chelate) 126mg, Heart (of bovine source, not an extract) and Inulin (from Chicory), L-Carnitine 175mg, L-Taurine 87mg, Coenzyme Q10 21mg",
    suggestedDosage: "1-3x daily",
    similarTo: "Cardi Plus",
    totalMg: 409
  },
  {
    name: "Histamine Support",
    systemSupported: "Immune, Histamine control",
    activeIngredients: "Calcium (as dicalcium phosphate) 38mg, Iron (as Ferrous Fumarate) 1.95mg, Vitamin B12 (as cyanocobalamin) 10mcg, Phosphorus (as dicalcium phosphate) 29mg, Chromium (as polynicotinate) 1mcg, Liver (of bovine source, not an extract) 80mg, Bovine liver fat extract 40mg",
    suggestedDosage: "1x daily",
    similarTo: "Hista Plus",
    totalMg: 189
  },
  {
    name: "Immune-C",
    systemSupported: "Immune",
    activeIngredients: "Vitamin C (from Camu Camu) 8.4mg, Soursop (leaf) (Graviola) 70mg, Cats Claw (bark) 70mg, Dragon's Blood Croton (sap) 70mg, Astragalus (root) 70mg, Camu Camu (berry) 70mg",
    suggestedDosage: "3x daily",
    similarTo: "Immu-C",
    totalMg: 358
  },
  {
    name: "Intestinal Formula",
    systemSupported: "Digestion, Elimination",
    activeIngredients: "Cape Aloe (leaf), Senna (leaf), Cascara Sagrada (bark), Ginger (root), Barberry (root), Garlic (bulb), and Cayenne (fruit)",
    suggestedDosage: "1x daily"
  },
  {
    name: "Ligament Support",
    systemSupported: "Muscles, Connective Tissues",
    activeIngredients: "Calcium (as Lactate, Dicalcium Phosphate) 4mg, Phosphorus (as Dicalcium Phosphate) 29mg, Magnesium (as Citrate) 2mg, Manganese (as Sulfate) 11mg, Citrus Bioflavonoids 50mg, Pancreatin (8X) 12mg, L-Lysine 5mg, Ox Bile 5mg, Spleen (Bovine) 5mg, Thymus (Bovine) 5mg, Betaine HCI 2mg, Boron (as Amino Acid Chelate) 100mcg, Bromelain 600 GDU/mg 0.3mg",
    suggestedDosage: "1-3x daily",
    similarTo: "Liga Plus",
    totalMg: 125
  },
  {
    name: "LSK Plus",
    systemSupported: "Liver, Kidneys, Spleen",
    activeIngredients: "Dandelion (root), Stinging Nettle (leaf), Uva Ursi (leaf), Artichoke (leaf), Goldenrod (aerial parts), Marshmallow (root), Milk Thistle (herb), Yellow Dock (root), Yarrow (flower), Agrimony (aerial parts), Oat Straw (aerial parts), Meadowsweet (herb), Liver 5mg, Spleen & Kidney 5mg of Bovine source, not an extract",
    suggestedDosage: "1x daily"
  },
  {
    name: "Liver Support",
    systemSupported: "Liver",
    activeIngredients: "Vitamin A (100% as Beta-Carotene) 1,000 IU, Liver (of a bovine source, not an extract) 350mg, Dandelion (root) 50mg, Oregon Grape (root) 50mg, Barberry (root) 50mg, Choline Bitartrate 10mg, Inositol 10mg, Betaine HCl 10mg, Disodium Phosphate, Calcium",
    suggestedDosage: "1x daily",
    similarTo: "Hepachol",
    totalMg: 530
  },
  {
    name: "Lung Support",
    systemSupported: "Lungs, Immune",
    activeIngredients: "Vitamin A (as palmitate) 8,000 IU, Vitamin C (Ascorbic Acid) 16mg, Vitamin B (as Calcium Pantothenate) 15mg, Lung 75mg, Adrenal 55mg, Lymph 30mg of bovine source, not from an extract, Eucalyptus 30mg, Thymus 20mg, Psyllium husk 1mg",
    suggestedDosage: "1x daily",
    similarTo: "Pneumo Plus",
    totalMg: 242
  },
  {
    name: "MG/K",
    systemSupported: "Autonomic Nervous System, Adrenal Glands",
    activeIngredients: "Magnesium (from 250mg Magnesium Aspartate Complex) 90mg, Potassium (from 250mg Potassium Aspartate Complex) 90mg",
    suggestedDosage: "1x daily",
    similarTo: "MG/K ASPARTATE",
    totalMg: 180
  },
  {
    name: "Mold RX",
    systemSupported: "Detox - Mold",
    activeIngredients: "Wild oregano extract 200mg, Pau D'Arco (bark) 100mg, Chaga Mushroom 75mg, Sage Leaf 50mg, Mullein Leaf 50mg, Stinging Nettle 50mg",
    suggestedDosage: "1x daily",
    similarTo: "Mold X",
    totalMg: 525
  },
  {
    name: "Spleen Support",
    systemSupported: "Lymphatic, Blood",
    activeIngredients: "Vitamin E (as dl-alpha Tocopheryl Acetate) 75 IU, Bovine Spleen Concentrate 250mcg, Dandelion (aerial parts) 75mg, Nettle (root) 75mg",
    suggestedDosage: "1x daily",
    similarTo: "Alpha E Spleen",
    totalMg: 150
  },
  {
    name: "Ovary Uterus Support",
    systemSupported: "Female Reproductive System",
    activeIngredients: "Calcium (as Dicalcium Phosphate) 26mg, Phosphorus (as Dicalcium Phosphate) 21mg, Zinc (as Citrate) 5mg, Ovary (Bovine) 100mg, Uterus (Bovine) 100mg, Blue Cohosh Root 1mg",
    suggestedDosage: "1x daily",
    similarTo: "Ovary Uterus Plus",
    totalMg: 253
  },
  {
    name: "Para X",
    systemSupported: "Parasite Support",
    activeIngredients: "Black Walnut (hull) 100mg, Pumpkin Powder (seed) 100mg, Wormwood Powder (aerial parts) 100mg, Hyssop Powder (aerial parts) 50mg, Thyme (leaf) 50mg, Pancreatin 31mg, L-Lysine 25mg, Ox Bile 25mg, Pepsin 17mg, Cellulase 2mg, Bromelain 84 MCU",
    suggestedDosage: "1x daily",
    similarTo: "Para Plus",
    totalMg: 500
  },
  {
    name: "Para Thy",
    systemSupported: "Parathyroid, Thyroid",
    activeIngredients: "Calcium (as calcium citrate) 100mg, Iodine (from sea kelp) 225mcg, Bovine Parathyroid Concentrate 500mcg, Bovine Thyroid Concentrate (thyroxin free) 25mg, Papain (525 TU/mg) 10mg",
    suggestedDosage: "1x daily",
    totalMg: 135
  },
  {
    name: "Pitui Plus",
    systemSupported: "Pituitary Gland",
    activeIngredients: "Calcium (from dicalcium phosphate) 219mg, Phosphorous (from dicalcium phosphate) 170mg, Manganese (from Manganese Sulfate) 11mg, Pituitary 135mg, Hypothalamus 75mg, Yarrow (flower) 45mg",
    suggestedDosage: "1-3x daily",
    totalMg: 655
  },
  {
    name: "Prostate Support",
    systemSupported: "Prostate",
    activeIngredients: "Magnesium (as Citrate) 3mg, Zinc (as Amino Acid Chelate) 15mg, Molybdenum (as Amino Acid Chelate) 50mcg, Potassium (as Aspartate) 4mg, Boron (as Amino Acid Chelate) 250mcg, Prostate (Bovine) 90mg, Juniper Berry 50mg, Chaga Mushroom 20mg, Betaine HCI 5mg, Saw Palmetto Berry 15mg",
    suggestedDosage: "1x daily",
    similarTo: "Prosta Plus",
    totalMg: 202
  },
  {
    name: "Kidney & Bladder Support",
    systemSupported: "Kidneys, Bladder",
    activeIngredients: "Raw Kidney concentrate, Raw Liver Concentrate of a bovine source, not an extract, Uva-Ursi (leaf), Echinacea purpurea (root), Goldenrod (aerial parts) (Solidago), Disodium Phosphate, and Juniper (berry); Dicalcium phosphate",
    suggestedDosage: "1x daily",
    similarTo: "Rena Plus"
  },
  {
    name: "Thyroid Support",
    systemSupported: "Thyroid, Adrenal Glands",
    activeIngredients: "Iodine (from Kelp) 900mcg, Raw Bovine Thyroid Concentrate (Thyroxine free) 60mg, Porcine Adrenal Concentrate 30mg, Raw Bovine Pituitary Concentrate 10mg, Raw Porcine Spleen Concentrate 10mg, Kelp 180mg",
    suggestedDosage: "1-3x daily",
    similarTo: "Thyro Plus",
    totalMg: 290
  }
];

export const INDIVIDUAL_INGREDIENTS: IndividualIngredient[] = [
  {
    name: "Aloe Vera Powder",
    standardDose: "250mg",
    drugInteractions: ["Digoxin", "Antidiabetes drugs", "Sevoflurane", "Laxatives", "Diuretics"],
    benefits: "Lowers blood sugar levels, may improve skin and prevent wrinkles, reduces constipation, help treat canker sores, reduces dental plaque, accelerates wound healing, has antioxidant and antibacterial properties"
  },
  {
    name: "Ashwagandha",
    standardDose: "600mg",
    drugInteractions: ["Digoxin"],
    benefits: "Exhibits anti-inflammatory and antioxidant effects, may have anticancer properties, may help improve respiratory health, may have antimicrobial properties"
  },
  {
    name: "Astragalus",
    standardDose: "N/A",
    drugInteractions: ["Immunosuppressants", "Lithium"],
    benefits: "May Boost Your Immune System, May Improve Heart Function, May Alleviate Side Effects of Chemotherapy, May Help Control Blood Sugar Levels, May Improve Kidney Function, Improve symptoms of chronic fatigue, Improve seasonal allergy symptoms"
  },
  {
    name: "Black Currant Extract",
    standardDose: "N/A",
    drugInteractions: [],
    benefits: "Boosts immune system, joint jump starter, plaque punisher and heart helper, skin soother. Antimicrobial, anti-inflammatory, antiviral, antitoxic, antiseptic."
  },
  {
    name: "Broccoli Powder",
    standardDose: "N/A",
    drugInteractions: [],
    benefits: "May help prevent cancer, help on cholesterol reduction, may reduce allergic reaction and inflammation, powerful antioxidant, support Bone health, commonly used to support heart health, Diet aid great for detoxification, eye care, anti-aging, prevents and fights pollution and toxins"
  },
  {
    name: "Camu Camu",
    standardDose: "N/A",
    drugInteractions: [],
    benefits: "High in vitamin C, contains powerful antioxidants, may fight inflammation, improve blood sugar levels, may help reducing weight, antimicrobial properties"
  },
  {
    name: "Cape Aloe",
    standardDose: "N/A",
    drugInteractions: [],
    benefits: "Exhibit wound healing, laxative properties, antioxidant, anti-inflammatory, antimicrobial, anticancer, antimalarial and anthelmintic activities"
  },
  {
    name: "Cats Claw",
    standardDose: "30mg",
    drugInteractions: ["Immunosuppressants", "High Blood Pressure reducers"],
    benefits: "May Boost Your Immune System, may Relieve Symptoms of Osteoarthritis, may Relieve Symptoms of Rheumatoid Arthritis"
  },
  {
    name: "Garlic (powder)",
    standardDose: "200mg",
    drugInteractions: ["Isoniazid", "NNRTIs", "Saquinavir", "Estrogens", "Cyclosporine", "Anticoagulant"],
    benefits: "Can combat sickness, including the common cold, can reduce blood pressure, improves cholesterol levels, which may lower the risk of heart disease, may help prevent alzheimer's disease and dementia, athletic performance might be improved with garlic supplements, may help detoxify heavy metals in the body, may improve bone health"
  },
  {
    name: "Ginger Root",
    standardDose: "500mg",
    drugInteractions: ["Blood thinners"],
    benefits: "Antibacterial power, calms nausea and vomiting, may sooth soreness, anti-inflammatory benefits, may slow down the growth of some cancers, may help your body use insulin better, may help with period pains, lowers cholesterol, relieves Indigestion"
  },
  {
    name: "Ginkgo Biloba Extract 24%",
    standardDose: "80-100mg",
    drugInteractions: ["Ibuprofen", "Blood Thinners", "Antidepressants", "Brain Chemistry Altering", "Blood Sugar Lowering"],
    benefits: "Antioxidants, can help fight inflammation, improves circulation and heart health, reduces symptoms of psychiatric disorders and dementia, improves brain function and well-being, can reduce anxiety, can treat depression, can support vision and eye health"
  },
  {
    name: "Graviola",
    standardDose: "N/A",
    drugInteractions: [],
    benefits: "High in Antioxidants, may help kill cancer cells, can help fight bacteria, could reduce inflammation, it may help stabilize blood sugar levels"
  },
  {
    name: "Hawthorn Berry PE 1/8% Flavones",
    standardDose: "N/A",
    drugInteractions: ["Digoxin", "High Blood Pressure", "Blood Flow Altering"],
    benefits: "Loaded with antioxidants, may have anti-inflammatory properties, may lower blood pressure, may decrease blood fats, used to aid digestion, helps prevent hair loss, may reduce anxiety, used to treat heart failure"
  },
  {
    name: "Lutein",
    standardDose: "10mg",
    drugInteractions: [],
    benefits: "Support eye health, may protect your skin"
  },
  {
    name: "Maca",
    standardDose: "N/A",
    drugInteractions: [],
    benefits: "It Increases Libido in Men and Women, may increase fertility in men, may help relieve symptoms of menopause, can improve your mood, it may boost sports performance and energy, when applied to the skin, Maca may help protect It from the sun"
  },
  {
    name: "Maca Root .6%",
    standardDose: "N/A",
    drugInteractions: [],
    benefits: "It Increases Libido in Men and Women, may increase fertility in men, may help relieve symptoms of menopause, can improve your mood, it may boost sports performance and energy, when applied to the skin, Maca may help protect It from the sun"
  },
  {
    name: "Magnesium",
    standardDose: "320mg",
    drugInteractions: ["Antibiotics", "Potassium-sparing diuretics", "Muscle Relaxants", "Calcium Channel Blockers"],
    benefits: "It may boost exercise performance, magnesium fights depression, benefits against type 2 diabetes, magnesium can lower blood pressure, anti-inflammatory benefits, can help prevent migraines, reduces insulin resistance"
  },
  {
    name: "Omega 3 (algae omega)",
    standardDose: "N/A",
    drugInteractions: [],
    benefits: "can fight depression and anxiety, can improve eye health, can promote brain health during pregnancy and early life, can improve risk factors for heart disease, can reduce symptoms of ADHD in children, can reduce symptoms of metabolic syndrome"
  },
  {
    name: "Phosphatidylcholine 40% (soy)",
    standardDose: "N/A",
    drugInteractions: ["Cholinergic and Anticholinergic drugs"],
    benefits: "can help boost cognitive function, may aid in liver repair, may help protect against medication side effects, may help ease symptoms of ulcerative colitis, may promote lipolysis, may help dissolve gallstones"
  },
  {
    name: "Resveratrol",
    standardDose: "N/A",
    drugInteractions: ["Estrogen-based medications"],
    benefits: "May help lower blood pressure, positive effect on blood fats, protects the brain, may increase insulin sensitivity, may ease joint pain, may suppress cancer cells"
  },
  {
    name: "Saw Palmetto Extract 45% Fatty Acid (GC)",
    standardDose: "N/A",
    drugInteractions: ["Estrogen-based medications"],
    benefits: "prevents hair loss, improves urinary tract function, may support prostate health, may decrease inflammation, may help regulate testosterone levels"
  },
  {
    name: "Stinging Nettle",
    standardDose: "N/A",
    drugInteractions: ["Lithium", "Diabetes", "High Blood Pressure", "Sedatives", "Blood Thinners"],
    benefits: "May reduce inflammation, may treat enlarged prostate symptoms, may treat hay fever, may lower blood pressure, may aid blood sugar control"
  },
  {
    name: "Sumar Root",
    standardDose: "N/A",
    drugInteractions: [],
    benefits: "May act as an adaptogen, may have anti-inflammatory and antioxidant properties, may offer protection against cancer may improve fertility, may improve digestion"
  },
  {
    name: "Turmeric Root Extract 4:1",
    standardDose: "500mg",
    drugInteractions: ["Blood clotting"],
    benefits: "Is a natural anti-inflammatory, is a powerful antioxidant, has anti-cancer effects, may help with skin conditions, might be brain food"
  },
  {
    name: "Vitamin C",
    standardDose: "90mg",
    drugInteractions: ["Chemotherapy", "Blood thinners"],
    benefits: "May reduce your risk of chronic disease, may help manage high blood pressure, may lower, may reduce blood uric acid levels and help prevent gout attacks risk of heart disease, helps prevent iron deficiency, boosts immunity"
  },
  {
    name: "Vitamin E (Mixed tocopherols)",
    standardDose: "15mg",
    drugInteractions: ["Aspirin", "Blood thinners"],
    benefits: "Antioxidant, longer cell life, balance Oil production, nourishes skin"
  }
];
