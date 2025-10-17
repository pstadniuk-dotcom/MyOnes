// Shared ingredient catalog - available to both frontend and backend

export interface IngredientInfo {
  name: string;
  doseMg: number;
  category: 'base' | 'individual';
}

export const BASE_FORMULAS: IngredientInfo[] = [
  { name: 'Adrenal Support', doseMg: 420, category: 'base' },
  { name: 'Alpha Gest III', doseMg: 636, category: 'base' },
  { name: 'Alpha Green II', doseMg: 400, category: 'base' },
  { name: 'Alpha Oxyme', doseMg: 350, category: 'base' },
  { name: 'Alpha Zyme III', doseMg: 400, category: 'base' },
  { name: 'Beta Max', doseMg: 2500, category: 'base' },
  { name: 'Br-SP Plus', doseMg: 400, category: 'base' },
  { name: 'C Boost', doseMg: 1680, category: 'base' },
  { name: 'Circu Plus', doseMg: 540, category: 'base' },
  { name: 'Colostrum Powder', doseMg: 1000, category: 'base' },
  { name: 'Chola Plus', doseMg: 350, category: 'base' },
  { name: 'Dia Zyme', doseMg: 494, category: 'base' },
  { name: 'Diadren Forte', doseMg: 400, category: 'base' },
  { name: 'Endocrine Support', doseMg: 350, category: 'base' },
  { name: 'Heart Support', doseMg: 450, category: 'base' },
  { name: 'Histamine Support', doseMg: 190, category: 'base' },
  { name: 'Immune-C', doseMg: 430, category: 'base' },
  { name: 'Intestinal Formula', doseMg: 400, category: 'base' },
  { name: 'Ligament Support', doseMg: 400, category: 'base' },
  { name: 'LSK Plus', doseMg: 450, category: 'base' },
  { name: 'Liver Support', doseMg: 480, category: 'base' },
  { name: 'Lung Support', doseMg: 250, category: 'base' },
  { name: 'MG/K', doseMg: 500, category: 'base' },
  { name: 'Mold RX', doseMg: 525, category: 'base' },
  { name: 'Spleen Support', doseMg: 400, category: 'base' },
  { name: 'Ovary Uterus Support', doseMg: 300, category: 'base' },
  { name: 'Para X', doseMg: 500, category: 'base' },
  { name: 'Para Thy', doseMg: 335, category: 'base' },
  { name: 'Pitui Plus', doseMg: 495, category: 'base' },
  { name: 'Prostate Support', doseMg: 300, category: 'base' },
  { name: 'Kidney & Bladder Support', doseMg: 400, category: 'base' },
  { name: 'Thyroid Support', doseMg: 470, category: 'base' },
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
