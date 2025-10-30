// Shared ingredient catalog - available to both frontend and backend

export interface IngredientInfo {
  name: string;
  doseMg: number;
  category: 'base' | 'individual';
  description?: string;  // Helpful description for user selection
}

export interface SubIngredient {
  name: string;
  amount: string;  // e.g., "20mg", "75 IU", "250mcg"
  description?: string;
}

export interface BaseFormulaDetails {
  name: string;
  doseMg: number;
  systemSupported: string;
  activeIngredients: SubIngredient[];
  suggestedDosage: string;
  description: string;
}

export const BASE_FORMULAS: IngredientInfo[] = [
  { name: 'Adrenal Support', doseMg: 420, category: 'base', description: 'Supports adrenal gland function and stress response' },
  { name: 'Alpha Gest III', doseMg: 636, category: 'base', description: 'Supports digestive enzyme production and gut health' },
  { name: 'Alpha Green II', doseMg: 400, category: 'base', description: 'Provides greens and phytonutrients for detoxification' },
  { name: 'Alpha Oxyme', doseMg: 350, category: 'base', description: 'Supports cellular oxygen utilization and energy' },
  { name: 'Alpha Zyme III', doseMg: 400, category: 'base', description: 'Digestive enzyme blend for protein, fat, and carb breakdown' },
  { name: 'Beta Max', doseMg: 2500, category: 'base', description: 'Immune system support with beta-glucans' },
  { name: 'Br-SP Plus', doseMg: 400, category: 'base', description: 'Supports brain and spinal cord health' },
  { name: 'C Boost', doseMg: 1680, category: 'base', description: 'High-dose vitamin C for immune and antioxidant support' },
  { name: 'Circu Plus', doseMg: 540, category: 'base', description: 'Supports healthy circulation and vascular function' },
  { name: 'Colostrum Powder', doseMg: 1000, category: 'base', description: 'Immune factors and gut lining support' },
  { name: 'Chola Plus', doseMg: 350, category: 'base', description: 'Supports bile production and gallbladder function' },
  { name: 'Dia Zyme', doseMg: 494, category: 'base', description: 'Comprehensive digestive enzyme formula' },
  { name: 'Diadren Forte', doseMg: 400, category: 'base', description: 'Advanced adrenal and stress hormone support' },
  { name: 'Endocrine Support', doseMg: 350, category: 'base', description: 'Supports overall hormonal balance and endocrine function' },
  { name: 'Heart Support', doseMg: 450, category: 'base', description: 'Supports cardiovascular health and heart function' },
  { name: 'Histamine Support', doseMg: 190, category: 'base', description: 'Helps manage histamine response and allergies' },
  { name: 'Immune-C', doseMg: 430, category: 'base', description: 'Vitamin C plus immune-boosting herbs' },
  { name: 'Intestinal Formula', doseMg: 400, category: 'base', description: 'Supports gut lining integrity and intestinal health' },
  { name: 'Ligament Support', doseMg: 400, category: 'base', description: 'Supports connective tissue and joint health' },
  { name: 'LSK Plus', doseMg: 450, category: 'base', description: 'Supports liver, spleen, and kidney function' },
  { name: 'Liver Support', doseMg: 480, category: 'base', description: 'Supports liver detoxification and function' },
  { name: 'Lung Support', doseMg: 250, category: 'base', description: 'Supports respiratory health and lung function' },
  { name: 'MG/K', doseMg: 500, category: 'base', description: 'Magnesium and potassium for muscle and heart health' },
  { name: 'Mold RX', doseMg: 525, category: 'base', description: 'Supports body\'s response to mold exposure' },
  { name: 'Spleen Support', doseMg: 400, category: 'base', description: 'Supports spleen and immune function' },
  { name: 'Ovary Uterus Support', doseMg: 300, category: 'base', description: 'Supports female reproductive health' },
  { name: 'Para X', doseMg: 500, category: 'base', description: 'Supports body\'s response to parasites' },
  { name: 'Para Thy', doseMg: 335, category: 'base', description: 'Supports parathyroid and calcium metabolism' },
  { name: 'Pitui Plus', doseMg: 495, category: 'base', description: 'Supports pituitary gland and master hormone regulation' },
  { name: 'Prostate Support', doseMg: 300, category: 'base', description: 'Supports male prostate health and urinary function' },
  { name: 'Kidney & Bladder Support', doseMg: 400, category: 'base', description: 'Supports urinary tract and kidney function' },
  { name: 'Thyroid Support', doseMg: 470, category: 'base', description: 'Supports thyroid function and metabolism' },
];

export const INDIVIDUAL_INGREDIENTS: IngredientInfo[] = [
  { name: 'Aloe Vera Powder', doseMg: 250, category: 'individual' },
  { name: 'Ahswaganda', doseMg: 600, category: 'individual' },
  { name: 'Astragalus', doseMg: 300, category: 'individual' },
  { name: 'Black Currant Extract', doseMg: 300, category: 'individual' },
  { name: 'Broccoli Powder', doseMg: 300, category: 'individual' },
  { name: 'Camu Camu', doseMg: 300, category: 'individual' },
  { name: 'Cape Aloe', doseMg: 300, category: 'individual' },
  { name: 'Cats Claw', doseMg: 30, category: 'individual' },
  { name: 'Chaga', doseMg: 300, category: 'individual' },
  { name: 'Cinnamon 20:1', doseMg: 1000, category: 'individual' },
  { name: 'CoEnzyme Q10', doseMg: 200, category: 'individual' },
  { name: 'Gaba', doseMg: 300, category: 'individual' },
  { name: 'Garlic (powder)', doseMg: 200, category: 'individual' },
  { name: 'Ginger Root', doseMg: 500, category: 'individual' },
  { name: 'Ginko Biloba Extract 24%', doseMg: 100, category: 'individual' },
  { name: 'Graviola', doseMg: 300, category: 'individual' },
  { name: 'Hawthorn Berry PE 1/8% Flavones', doseMg: 300, category: 'individual' },
  { name: 'Lutein', doseMg: 10, category: 'individual' },
  { name: 'Maca Root .6%', doseMg: 300, category: 'individual' },
  { name: 'Magnesium', doseMg: 320, category: 'individual' },
  { name: 'Omega 3 (algae omega)', doseMg: 300, category: 'individual' },
  { name: 'Phosphatidylcholine 40% (soy)', doseMg: 300, category: 'individual' },
  { name: 'Resveratrol', doseMg: 300, category: 'individual' },
  { name: 'Saw Palmetto Extract 45% Fatty Acid (GC)', doseMg: 300, category: 'individual' },
  { name: 'Stinging Nettle', doseMg: 300, category: 'individual' },
  { name: 'Sumar Root', doseMg: 300, category: 'individual' },
  { name: 'Turmeric Root Extract 4:1', doseMg: 500, category: 'individual' },
  { name: 'Vitamin C', doseMg: 90, category: 'individual' },
  { name: 'Vitamin E (Mixed tocopherols)', doseMg: 15, category: 'individual' },
];

export const BASE_FORMULA_DETAILS: BaseFormulaDetails[] = [
  {
    name: 'Adrenal Support',
    doseMg: 420,
    systemSupported: 'Endocrine, Metabolism',
    suggestedDosage: '1x daily',
    description: 'Supports adrenal gland function and stress response',
    activeIngredients: [
      { name: 'Vitamin C', amount: '20mg', description: 'from Camu Camu Berry' },
      { name: 'Pantothenic Acid', amount: '50mg', description: 'as Calcium Pantothenate' },
      { name: 'Adrenal', amount: '250mg', description: 'of bovine source, not an extract' },
      { name: 'Licorice', amount: '50mg', description: 'root' },
      { name: 'Ginger', amount: '25mg', description: 'rhizome' },
      { name: 'Kelp', amount: '25mg', description: 'entire plant' },
    ]
  },
  {
    name: 'Alpha Gest III',
    doseMg: 636,
    systemSupported: 'Digestion',
    suggestedDosage: '1x daily',
    description: 'Supports digestive enzyme production and gut health',
    activeIngredients: [
      { name: 'Betaine', amount: '496mg', description: 'from 650mg Betaine HCl' },
      { name: 'Pepsin', amount: '140mg', description: '1:10,000' },
    ]
  },
  {
    name: 'Alpha Green II',
    doseMg: 400,
    systemSupported: 'Spleen, Lymphatic system',
    suggestedDosage: '1x daily',
    description: 'Provides greens and phytonutrients for detoxification',
    activeIngredients: [
      { name: 'Vitamin E', amount: '75 IU', description: 'as dl-alpha Tocopheryl Acetate' },
      { name: 'Bovine Spleen Concentrate', amount: '250mcg' },
      { name: 'Dandelion', amount: '75mg', description: 'aerial parts' },
      { name: 'Nettle', amount: '75mg', description: 'root' },
    ]
  },
  {
    name: 'Alpha Oxyme',
    doseMg: 350,
    systemSupported: 'Antioxidant',
    suggestedDosage: '1x daily',
    description: 'Supports cellular oxygen utilization and energy',
    activeIngredients: [
      { name: 'Vitamin A', amount: '1500 IU', description: 'as Beta-Carotene' },
      { name: 'Selenium', amount: '5mcg', description: 'Amino Acid Chelate' },
      { name: 'Superoxide Dismutase (SOD)', amount: 'blend', description: 'Supplying Aloe Vera leaf, Rosemary Leaf Extract, and L-Cysteine' },
    ]
  },
  {
    name: 'Alpha Zyme III',
    doseMg: 400,
    systemSupported: 'Pancreas, Nutrition',
    suggestedDosage: '1x daily',
    description: 'Digestive enzyme blend for protein, fat, and carb breakdown',
    activeIngredients: [
      { name: 'Magnesium', amount: '23mg', description: 'as Aspartate, Oxide' },
      { name: 'Potassium', amount: '23mg', description: 'as Aspartate, Chloride' },
      { name: 'Pancreatin 8X', amount: '78mg' },
      { name: 'Ox Bile', amount: '63mg' },
      { name: 'L-Lysine', amount: '63mg' },
      { name: 'Pepsin', amount: '42mg', description: '1:10,000' },
      { name: 'Proprietary Blend', amount: '125mg', description: 'Barley Grass, Alfalfa, Celery, Parsley, Spirulina, Spinach, Watercress' },
      { name: 'Bromelain', amount: '0.2mg', description: '600 GDU/mg' },
    ]
  },
  {
    name: 'Beta Max',
    doseMg: 2500,
    systemSupported: 'Liver, Gallbladder, Pancreas',
    suggestedDosage: '4x daily',
    description: 'Supports liver detoxification and bile production',
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
    name: 'Br-SP Plus',
    doseMg: 400,
    systemSupported: 'Digestion, Immune',
    suggestedDosage: '1x daily',
    description: 'Supports digestive health and immune function',
    activeIngredients: [
      { name: 'Black Radish', amount: 'blend', description: 'root' },
      { name: 'Green Cabbage', amount: 'blend', description: 'leaf' },
      { name: 'Alfalfa', amount: 'blend', description: 'leaf' },
      { name: 'Pepsin', amount: 'blend', description: '100,000 FCC' },
      { name: 'Pituitary', amount: 'blend', description: 'of bovine source, not an extract' },
      { name: 'Duodenum and Stomach', amount: 'blend', description: 'of porcine source, not an extract' },
    ]
  },
  {
    name: 'C Boost',
    doseMg: 1680,
    systemSupported: 'Soft tissue, Capillaries',
    suggestedDosage: '3x daily',
    description: 'High-dose vitamin C for immune and antioxidant support',
    activeIngredients: [
      { name: 'Vitamin C', amount: '80mg', description: 'as Ascorbic Acid' },
      { name: 'Citrus bioflavonoid Complex', amount: '1100mg' },
      { name: 'Camu Camu Berry extract', amount: '500mg' },
    ]
  },
  {
    name: 'Circu Plus',
    doseMg: 540,
    systemSupported: 'Circulation',
    suggestedDosage: '1x daily',
    description: 'Supports healthy circulation and vascular function',
    activeIngredients: [
      { name: 'Calcium', amount: '20mg', description: 'as Calcium Carbonate' },
      { name: 'Ginkgo Biloba', amount: '166mg', description: 'leaf' },
      { name: 'Siberian Ginseng', amount: '166mg', description: 'root' },
      { name: "Butcher's Broom", amount: '166mg', description: 'root' },
      { name: 'Pancreatin', amount: '25mg', description: '8X' },
    ]
  },
  {
    name: 'Colostrum Powder',
    doseMg: 1000,
    systemSupported: 'Immune, growth and tissue repair factors',
    suggestedDosage: '1000mg daily dose',
    description: 'Immune factors and gut lining support',
    activeIngredients: [
      { name: 'Colostrum powder', amount: '1000mg' },
    ]
  },
  {
    name: 'Chola Plus',
    doseMg: 350,
    systemSupported: 'Stomach, Liver, Gallbladder, Pancreas',
    suggestedDosage: '1x daily',
    description: 'Supports bile production and gallbladder function',
    activeIngredients: [
      { name: 'Niacin', amount: '0.4mg' },
      { name: 'Chromium', amount: '40mg', description: 'as Polynicotinate' },
      { name: 'Lecithin', amount: '100mg', description: 'from soy' },
      { name: 'Flax seed', amount: '100mg' },
      { name: 'Pancreatin', amount: '40mg', description: '8X' },
      { name: 'Choline Bitartrate', amount: '50mg' },
      { name: 'Ginkgo Biloba', amount: '17mg', description: 'leaf' },
      { name: 'Eleuthero', amount: '17mg', description: 'root' },
      { name: "Butcher's Broom", amount: '17mg' },
      { name: 'Inositol', amount: '6mg' },
      { name: 'Sage', amount: '4mg', description: 'leaf' },
      { name: 'DL-Methionine', amount: '2mg' },
      { name: 'Betaine HCL', amount: '2mg' },
      { name: 'Artichoke', amount: '2mg', description: 'leaf' },
      { name: 'Dandelion', amount: '2mg', description: 'leaf' },
      { name: 'Milk Thistle', amount: '2mg', description: 'seed' },
      { name: 'Turmeric', amount: '2mg', description: 'root' },
      { name: 'Bromelain', amount: '2mg' },
    ]
  },
  {
    name: 'Dia Zyme',
    doseMg: 494,
    systemSupported: 'Digestion, Pancreas',
    suggestedDosage: '1x daily',
    description: 'Comprehensive digestive enzyme formula',
    activeIngredients: [
      { name: 'Calcium', amount: '25mg', description: 'as Dicalcium Phosphate' },
      { name: 'Phosphorus', amount: '19mg', description: 'as Dicalcium Phosphate' },
      { name: 'Pancreatin', amount: '420mcg', description: '8X' },
      { name: 'Trypsin', amount: '30mg' },
      { name: 'Chymotrypsin', amount: '30mcg' },
    ]
  },
  {
    name: 'Diadren Forte',
    doseMg: 400,
    systemSupported: 'Liver, Gall Bladder, Pancreas, Adrenal Glands',
    suggestedDosage: '1x daily',
    description: 'Advanced adrenal and stress hormone support',
    activeIngredients: [
      { name: 'Vitamin C', amount: '25mg', description: 'Ascorbic Acid' },
      { name: 'Niacin', amount: '0.5mg', description: 'as Niacinamide' },
      { name: 'Pantothenic Acid', amount: '25mg', description: 'as Pantothenate' },
      { name: 'Chromium', amount: '50mcg', description: 'as Chromium GTF' },
      { name: 'Pancreatin 8X', amount: 'blend', description: 'Supplying Amylase 2,500 USP, Protease 2,500 USP, Lipase 200 USP' },
      { name: 'Adrenal', amount: '50mg', description: 'of bovine, not extract' },
      { name: 'Licorice', amount: '25mg', description: 'root' },
      { name: 'Ginger', amount: '12.5mg', description: 'rhizome' },
      { name: 'Choline', amount: '10mg' },
      { name: 'Inositol', amount: '7.5mg' },
      { name: 'Lecithin granules', amount: '5mg', description: 'soy' },
      { name: 'Sage', amount: '5mg', description: 'leaf & stem' },
      { name: 'L-Methionine', amount: '2.5mg' },
      { name: 'Betaine', amount: '2mg', description: 'from 2.5mg Betaine HCl' },
      { name: 'Dandelion', amount: '2.5mg', description: 'leaf' },
      { name: 'Turmeric', amount: '2.5mg', description: 'rhizome' },
      { name: 'Milk Thistle', amount: '2.5mg', description: 'herb, providing Silymarin' },
      { name: 'Artichoke', amount: '2.5mg', description: 'leaf' },
      { name: 'Bromelain', amount: '2.5mcu' },
      { name: 'Sea Kelp', amount: '12.5mcg', description: 'entire plant' },
    ]
  },
  {
    name: 'Endocrine Support',
    doseMg: 350,
    systemSupported: 'Endocrine (female)',
    suggestedDosage: '1x daily',
    description: 'Supports overall hormonal balance and endocrine function',
    activeIngredients: [
      { name: 'Pantothenic Acid', amount: '4.5mg', description: 'as Ca Pantothenate' },
      { name: 'Zinc', amount: '5.3mg', description: 'as Amino Acid Chelate' },
      { name: 'Manganese', amount: '1.8mg', description: 'as Sulfate' },
      { name: 'Ovary & Adrenal', amount: 'blend', description: 'Of a bovine source-not an extract' },
      { name: 'Goldenseal', amount: 'blend', description: 'leaf' },
      { name: 'Kelp', amount: 'blend', description: 'entire plant' },
      { name: 'Pituitary', amount: 'blend' },
      { name: 'Hypothalamus', amount: 'blend' },
      { name: 'Dulse', amount: 'blend' },
      { name: 'Yarrow Flower', amount: 'blend' },
    ]
  },
  {
    name: 'Heart Support',
    doseMg: 450,
    systemSupported: 'Heart',
    suggestedDosage: '1-3x daily',
    description: 'Supports cardiovascular health and heart function',
    activeIngredients: [
      { name: 'Magnesium', amount: '126mg', description: 'from Magnesium Amino Acid Chelate' },
      { name: 'Heart', amount: 'blend', description: 'of bovine source, not an extract' },
      { name: 'Inulin', amount: 'blend', description: 'from Chicory' },
      { name: 'L-Carnitine', amount: '175mg' },
      { name: 'L-Taurine', amount: '87mg' },
      { name: 'Coenzyme Q10', amount: '21mg' },
    ]
  },
  {
    name: 'Histamine Support',
    doseMg: 190,
    systemSupported: 'Immune, Histamine control',
    suggestedDosage: '1x daily',
    description: 'Helps manage histamine response and allergies',
    activeIngredients: [
      { name: 'Calcium', amount: '38mg', description: 'as dicalcium phosphate' },
      { name: 'Iron', amount: '1.95mg', description: 'as Ferrous Fumarate' },
      { name: 'Vitamin B12', amount: '10mcg', description: 'as cyanocobalamin' },
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
    suggestedDosage: '3x daily',
    description: 'Vitamin C plus immune-boosting herbs',
    activeIngredients: [
      { name: 'Vitamin C', amount: '8.4mg', description: 'from Camu Camu' },
      { name: 'Soursop', amount: '70mg', description: 'leaf (Graviola)' },
      { name: 'Cats Claw', amount: '70mg', description: 'bark' },
      { name: "Dragon's Blood Croton", amount: '70mg', description: 'sap' },
      { name: 'Astragalus', amount: '70mg', description: 'root' },
      { name: 'Camu Camu', amount: '70mg', description: 'berry' },
    ]
  },
  {
    name: 'Intestinal Formula',
    doseMg: 400,
    systemSupported: 'Digestion, Elimination',
    suggestedDosage: '1x daily',
    description: 'Supports gut lining integrity and intestinal health',
    activeIngredients: [
      { name: 'Cape Aloe', amount: 'blend', description: 'leaf' },
      { name: 'Senna', amount: 'blend', description: 'leaf' },
      { name: 'Cascara Sagrada', amount: 'blend', description: 'bark' },
      { name: 'Ginger', amount: 'blend', description: 'root' },
      { name: 'Barberry', amount: 'blend', description: 'root' },
      { name: 'Garlic', amount: 'blend', description: 'bulb' },
      { name: 'Cayenne', amount: 'blend', description: 'fruit' },
    ]
  },
  {
    name: 'Ligament Support',
    doseMg: 400,
    systemSupported: 'Muscles, Connective Tissues',
    suggestedDosage: '1-3x daily',
    description: 'Supports connective tissue and joint health',
    activeIngredients: [
      { name: 'Calcium', amount: '4mg', description: 'as Lactate, Dicalcium Phosphate' },
      { name: 'Phosphorus', amount: '29mg', description: 'as Dicalcium Phosphate' },
      { name: 'Magnesium', amount: '2mg', description: 'as Citrate' },
      { name: 'Manganese', amount: '11mg', description: 'as Sulfate' },
      { name: 'Citrus Bioflavonoids', amount: '50mg' },
      { name: 'Pancreatin', amount: '12mg', description: '8X' },
      { name: 'L-Lysine', amount: '5mg' },
      { name: 'Ox Bile', amount: '5mg' },
      { name: 'Spleen', amount: '5mg', description: 'Bovine' },
      { name: 'Thymus', amount: '5mg', description: 'Bovine' },
      { name: 'Betaine HCI', amount: '2mg' },
      { name: 'Boron', amount: '100mcg', description: 'as Amino Acid Chelate' },
      { name: 'Bromelain', amount: '0.3mg', description: '600 GDU/mg' },
    ]
  },
  {
    name: 'LSK Plus',
    doseMg: 450,
    systemSupported: 'Liver, Kidneys, Spleen',
    suggestedDosage: '1x daily',
    description: 'Supports liver, spleen, and kidney function',
    activeIngredients: [
      { name: 'Dandelion', amount: 'blend', description: 'root' },
      { name: 'Stinging Nettle', amount: 'blend', description: 'leaf' },
      { name: 'Uva Ursi', amount: 'blend', description: 'leaf' },
      { name: 'Artichoke', amount: 'blend', description: 'leaf' },
      { name: 'Goldenrod', amount: 'blend', description: 'aerial parts' },
      { name: 'Marshmallow', amount: 'blend', description: 'root' },
      { name: 'Milk Thistle', amount: 'blend', description: 'herb' },
      { name: 'Yellow Dock', amount: 'blend', description: 'root' },
      { name: 'Yarrow', amount: 'blend', description: 'flower' },
      { name: 'Agrimony', amount: 'blend', description: 'aerial parts' },
      { name: 'Oat Straw', amount: 'blend', description: 'aerial parts' },
      { name: 'Meadowsweet', amount: 'blend', description: 'herb' },
      { name: 'Liver', amount: '5mg', description: 'Bovine source, not an extract' },
      { name: 'Spleen & Kidney', amount: '5mg', description: 'Bovine source, not an extract' },
    ]
  },
  {
    name: 'Liver Support',
    doseMg: 480,
    systemSupported: 'Liver',
    suggestedDosage: '1x daily',
    description: 'Supports liver detoxification and function',
    activeIngredients: [
      { name: 'Vitamin A', amount: '1,000 IU', description: '100% as Beta-Carotene' },
      { name: 'Liver', amount: '350mg', description: 'of a bovine source, not an extract' },
      { name: 'Dandelion', amount: '50mg', description: 'root' },
      { name: 'Oregon Grape', amount: '50mg', description: 'root' },
      { name: 'Barberry', amount: '50mg', description: 'root' },
      { name: 'Choline Bitartrate', amount: '10mg' },
      { name: 'Inositol', amount: '10mg' },
      { name: 'Betaine HCl', amount: '10mg' },
    ]
  },
  {
    name: 'Lung Support',
    doseMg: 250,
    systemSupported: 'Lungs, Immune',
    suggestedDosage: '1x daily',
    description: 'Supports respiratory health and lung function',
    activeIngredients: [
      { name: 'Vitamin A', amount: '8,000 IU', description: 'as palmitate' },
      { name: 'Vitamin C', amount: '16mg', description: 'Ascorbic Acid' },
      { name: 'Vitamin B', amount: '15mg', description: 'as Calcium Pantothenate' },
      { name: 'Lung', amount: '75mg', description: 'bovine source, not from an extract' },
      { name: 'Adrenal', amount: '55mg', description: 'bovine source' },
      { name: 'Lymph', amount: '30mg', description: 'bovine source' },
      { name: 'Eucalyptus', amount: '30mg' },
      { name: 'Thymus', amount: '20mg' },
      { name: 'Psyllium husk', amount: '1mg' },
    ]
  },
  {
    name: 'MG/K',
    doseMg: 500,
    systemSupported: 'Autonomic Nervous System, Adrenal Glands',
    suggestedDosage: '1x daily',
    description: 'Magnesium and potassium for muscle and heart health',
    activeIngredients: [
      { name: 'Magnesium', amount: '90mg', description: 'from 250mg Magnesium Aspartate Complex' },
      { name: 'Potassium', amount: '90mg', description: 'from 250mg Potassium Aspartate Complex' },
    ]
  },
  {
    name: 'Mold RX',
    doseMg: 525,
    systemSupported: 'Detox - Mold',
    suggestedDosage: '1x daily',
    description: "Supports body's response to mold exposure",
    activeIngredients: [
      { name: 'Wild oregano extract', amount: '200mg' },
      { name: "Pau D'Arco", amount: '100mg', description: 'bark' },
      { name: 'Chaga Mushroom', amount: '75mg' },
      { name: 'Sage Leaf', amount: '50mg' },
      { name: 'Mullein Leaf', amount: '50mg' },
      { name: 'Stinging Nettle', amount: '50mg' },
    ]
  },
  {
    name: 'Spleen Support',
    doseMg: 400,
    systemSupported: 'Lymphatic, Blood',
    suggestedDosage: '1x daily',
    description: 'Supports spleen and immune function',
    activeIngredients: [
      { name: 'Vitamin E', amount: '75 IU', description: 'as dl-alpha Tocopheryl Acetate' },
      { name: 'Bovine Spleen Concentrate', amount: '250mcg' },
      { name: 'Dandelion', amount: '75mg', description: 'aerial parts' },
      { name: 'Nettle', amount: '75mg', description: 'root' },
    ]
  },
  {
    name: 'Ovary Uterus Support',
    doseMg: 300,
    systemSupported: 'Female Reproductive System',
    suggestedDosage: '1x daily',
    description: 'Supports female reproductive health',
    activeIngredients: [
      { name: 'Calcium', amount: '26mg', description: 'as Dicalcium Phosphate' },
      { name: 'Phosphorus', amount: '21mg', description: 'as Dicalcium Phosphate' },
      { name: 'Zinc', amount: '5mg', description: 'as Citrate' },
      { name: 'Ovary', amount: '100mg', description: 'Bovine' },
      { name: 'Uterus', amount: '100mg', description: 'Bovine' },
      { name: 'Blue Cohosh Root', amount: '1mg' },
    ]
  },
  {
    name: 'Para X',
    doseMg: 500,
    systemSupported: 'Parasites',
    suggestedDosage: '1x daily',
    description: "Supports body's response to parasites",
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
    ]
  },
  {
    name: 'Para Thy',
    doseMg: 335,
    systemSupported: 'Parathyroid, Thyroid',
    suggestedDosage: '1x daily',
    description: 'Supports parathyroid and calcium metabolism',
    activeIngredients: [
      { name: 'Calcium', amount: '100mg', description: 'as calcium citrate' },
      { name: 'Iodine', amount: '225mcg', description: 'from sea kelp' },
      { name: 'Bovine Parathyroid Concentrate', amount: '500mcg' },
      { name: 'Bovine Thyroid Concentrate', amount: '25mg', description: 'thyroxin free' },
      { name: 'Papain', amount: '10mg', description: '525 TU/mg' },
    ]
  },
  {
    name: 'Pitui Plus',
    doseMg: 495,
    systemSupported: 'Pituitary Gland',
    suggestedDosage: '1-3x daily',
    description: 'Supports pituitary gland and master hormone regulation',
    activeIngredients: [
      { name: 'Calcium', amount: '219mg', description: 'from dicalcium phosphate' },
      { name: 'Phosphorous', amount: '170mg', description: 'from dicalcium phosphate' },
      { name: 'Manganese', amount: '11mg', description: 'from Manganese Sulfate' },
      { name: 'Pituitary', amount: '135mg' },
      { name: 'Hypothalamus', amount: '75mg' },
      { name: 'Yarrow', amount: '45mg', description: 'flower' },
    ]
  },
  {
    name: 'Prostate Support',
    doseMg: 300,
    systemSupported: 'Prostate',
    suggestedDosage: '1x daily',
    description: 'Supports male prostate health and urinary function',
    activeIngredients: [
      { name: 'Magnesium', amount: '3mg', description: 'as Citrate' },
      { name: 'Zinc', amount: '15mg', description: 'as Amino Acid Chelate' },
      { name: 'Molybdenum', amount: '50mcg', description: 'as Amino Acid Chelate' },
      { name: 'Potassium', amount: '4mg', description: 'as Aspartate' },
      { name: 'Boron', amount: '250mcg', description: 'as Amino Acid Chelate' },
      { name: 'Prostate', amount: '90mg', description: 'Bovine' },
      { name: 'Juniper Berry', amount: '50mg' },
      { name: 'Chaga Mushroom', amount: '20mg' },
      { name: 'Betaine HCI', amount: '5mg' },
      { name: 'Saw Palmetto Berry', amount: '15mg' },
    ]
  },
  {
    name: 'Kidney & Bladder Support',
    doseMg: 400,
    systemSupported: 'Kidneys, Bladder',
    suggestedDosage: '1x daily',
    description: 'Supports urinary tract and kidney function',
    activeIngredients: [
      { name: 'Raw Kidney concentrate', amount: 'blend', description: 'bovine source, not an extract' },
      { name: 'Raw Liver Concentrate', amount: 'blend', description: 'bovine source, not an extract' },
      { name: 'Uva-Ursi', amount: 'blend', description: 'leaf' },
      { name: 'Echinacea purpurea', amount: 'blend', description: 'root' },
      { name: 'Goldenrod', amount: 'blend', description: 'aerial parts (Solidago)' },
      { name: 'Juniper', amount: 'blend', description: 'berry' },
    ]
  },
  {
    name: 'Thyroid Support',
    doseMg: 470,
    systemSupported: 'Thyroid, Adrenal Glands',
    suggestedDosage: '1-3x daily',
    description: 'Supports thyroid function and metabolism',
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

export const ALL_INGREDIENTS = [...BASE_FORMULAS, ...INDIVIDUAL_INGREDIENTS];

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
