// Shared ingredient catalog - available to both frontend and backend

export interface IngredientInfo {
  name: string;
  doseMg: number;
  category: 'base' | 'individual';
  description?: string;  // Helpful description for user selection
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

export const ALL_INGREDIENTS = [...BASE_FORMULAS, ...INDIVIDUAL_INGREDIENTS];

export function getIngredientDose(name: string): number | undefined {
  const ingredient = ALL_INGREDIENTS.find(ing => ing.name === name);
  return ingredient?.doseMg;
}

export function isValidIngredient(name: string): boolean {
  return ALL_INGREDIENTS.some(ing => ing.name === name);
}
