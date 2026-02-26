import '../server/env';
import { db } from '../server/infra/db/db';
import { ingredientPricing } from '../shared/schema';

function key(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

const seedRows = [
  // === Individual Ingredients (all 32 from catalog) ===
  { ingredientName: 'Aloe Vera Powder', typicalCapsuleMg: 500, typicalBottleCapsules: 100, typicalRetailPriceCents: 1699 },
  { ingredientName: 'Ashwagandha', typicalCapsuleMg: 600, typicalBottleCapsules: 60, typicalRetailPriceCents: 2299 },
  { ingredientName: 'Astragalus', typicalCapsuleMg: 500, typicalBottleCapsules: 120, typicalRetailPriceCents: 1899 },
  { ingredientName: 'Blackcurrant Extract', typicalCapsuleMg: 300, typicalBottleCapsules: 60, typicalRetailPriceCents: 2499 },
  { ingredientName: 'Broccoli Concentrate', typicalCapsuleMg: 500, typicalBottleCapsules: 60, typicalRetailPriceCents: 1999 },
  { ingredientName: 'Camu Camu', typicalCapsuleMg: 500, typicalBottleCapsules: 60, typicalRetailPriceCents: 1899 },
  { ingredientName: 'Cats Claw', typicalCapsuleMg: 500, typicalBottleCapsules: 100, typicalRetailPriceCents: 1499 },
  { ingredientName: 'Chaga', typicalCapsuleMg: 500, typicalBottleCapsules: 60, typicalRetailPriceCents: 2699 },
  { ingredientName: 'Curcumin', typicalCapsuleMg: 500, typicalBottleCapsules: 60, typicalRetailPriceCents: 3199 },
  { ingredientName: 'Cinnamon 20:1', typicalCapsuleMg: 500, typicalBottleCapsules: 120, typicalRetailPriceCents: 1399 },
  { ingredientName: 'CoEnzyme Q10', typicalCapsuleMg: 100, typicalBottleCapsules: 60, typicalRetailPriceCents: 3499 },
  { ingredientName: 'Colostrum Powder', typicalCapsuleMg: 500, typicalBottleCapsules: 60, typicalRetailPriceCents: 3299 },
  { ingredientName: 'GABA', typicalCapsuleMg: 750, typicalBottleCapsules: 60, typicalRetailPriceCents: 1699 },
  { ingredientName: 'Garlic', typicalCapsuleMg: 500, typicalBottleCapsules: 120, typicalRetailPriceCents: 1299 },
  { ingredientName: 'Ginger Root', typicalCapsuleMg: 550, typicalBottleCapsules: 120, typicalRetailPriceCents: 1499 },
  { ingredientName: 'Ginkgo Biloba Extract 24%', typicalCapsuleMg: 120, typicalBottleCapsules: 120, typicalRetailPriceCents: 1999 },
  { ingredientName: 'Graviola', typicalCapsuleMg: 600, typicalBottleCapsules: 100, typicalRetailPriceCents: 1899 },
  { ingredientName: 'Hawthorn Berry', typicalCapsuleMg: 500, typicalBottleCapsules: 120, typicalRetailPriceCents: 1499 },
  { ingredientName: 'InnoSlim', typicalCapsuleMg: 250, typicalBottleCapsules: 60, typicalRetailPriceCents: 3499 },
  { ingredientName: 'L-Theanine', typicalCapsuleMg: 200, typicalBottleCapsules: 60, typicalRetailPriceCents: 1999 },
  { ingredientName: 'Lutein', typicalCapsuleMg: 20, typicalBottleCapsules: 120, typicalRetailPriceCents: 2299 },
  { ingredientName: 'Maca', typicalCapsuleMg: 500, typicalBottleCapsules: 90, typicalRetailPriceCents: 1899 },
  { ingredientName: 'Magnesium', typicalCapsuleMg: 120, typicalBottleCapsules: 120, typicalRetailPriceCents: 2699 },
  { ingredientName: 'Red Ginseng', typicalCapsuleMg: 500, typicalBottleCapsules: 60, typicalRetailPriceCents: 2899 },
  { ingredientName: 'Resveratrol', typicalCapsuleMg: 250, typicalBottleCapsules: 60, typicalRetailPriceCents: 2999 },
  { ingredientName: 'Omega-3', typicalCapsuleMg: 1000, typicalBottleCapsules: 90, typicalRetailPriceCents: 3299 },
  { ingredientName: 'Phosphatidylcholine', typicalCapsuleMg: 450, typicalBottleCapsules: 60, typicalRetailPriceCents: 2999 },
  { ingredientName: 'Quercetin', typicalCapsuleMg: 500, typicalBottleCapsules: 60, typicalRetailPriceCents: 2499 },
  { ingredientName: 'Saw Palmetto Extract', typicalCapsuleMg: 320, typicalBottleCapsules: 90, typicalRetailPriceCents: 1799 },
  { ingredientName: 'Stinging Nettle', typicalCapsuleMg: 500, typicalBottleCapsules: 90, typicalRetailPriceCents: 1499 },
  { ingredientName: 'Suma Root', typicalCapsuleMg: 500, typicalBottleCapsules: 60, typicalRetailPriceCents: 1999 },
  { ingredientName: 'Vitamin E', typicalCapsuleMg: 400, typicalBottleCapsules: 90, typicalRetailPriceCents: 1899 },

  // === System Supports (proprietary blends - priced as equivalent multi-ingredient stacks) ===
  { ingredientName: 'Adrenal Support', typicalCapsuleMg: 420, typicalBottleCapsules: 60, typicalRetailPriceCents: 3499 },
  { ingredientName: 'Beta Max', typicalCapsuleMg: 600, typicalBottleCapsules: 60, typicalRetailPriceCents: 3299 },
  { ingredientName: 'C Boost', typicalCapsuleMg: 525, typicalBottleCapsules: 60, typicalRetailPriceCents: 2999 },
  { ingredientName: 'Endocrine Support', typicalCapsuleMg: 414, typicalBottleCapsules: 60, typicalRetailPriceCents: 3499 },
  { ingredientName: 'Heart Support', typicalCapsuleMg: 689, typicalBottleCapsules: 60, typicalRetailPriceCents: 3999 },
  { ingredientName: 'Histamine Support', typicalCapsuleMg: 470, typicalBottleCapsules: 60, typicalRetailPriceCents: 3299 },
  { ingredientName: 'Immune-C', typicalCapsuleMg: 495, typicalBottleCapsules: 60, typicalRetailPriceCents: 3199 },
  { ingredientName: 'Kidney & Bladder Support', typicalCapsuleMg: 520, typicalBottleCapsules: 60, typicalRetailPriceCents: 3299 },
  { ingredientName: 'Ligament Support', typicalCapsuleMg: 575, typicalBottleCapsules: 60, typicalRetailPriceCents: 3499 },
  { ingredientName: 'Liver Support', typicalCapsuleMg: 550, typicalBottleCapsules: 60, typicalRetailPriceCents: 3499 },
  { ingredientName: 'Lung Support', typicalCapsuleMg: 500, typicalBottleCapsules: 60, typicalRetailPriceCents: 3299 },
  { ingredientName: 'MG/K', typicalCapsuleMg: 322, typicalBottleCapsules: 60, typicalRetailPriceCents: 2999 },
  { ingredientName: 'Mold RX', typicalCapsuleMg: 486, typicalBottleCapsules: 60, typicalRetailPriceCents: 3499 },
  { ingredientName: 'Ovary Uterus Support', typicalCapsuleMg: 560, typicalBottleCapsules: 60, typicalRetailPriceCents: 3499 },
  { ingredientName: 'Para X', typicalCapsuleMg: 550, typicalBottleCapsules: 60, typicalRetailPriceCents: 3299 },
  { ingredientName: 'Prostate Support', typicalCapsuleMg: 550, typicalBottleCapsules: 60, typicalRetailPriceCents: 3499 },
  { ingredientName: 'Spleen Support', typicalCapsuleMg: 500, typicalBottleCapsules: 60, typicalRetailPriceCents: 3299 },
  { ingredientName: 'Thyroid Support', typicalCapsuleMg: 449, typicalBottleCapsules: 60, typicalRetailPriceCents: 3499 },

  // === Legacy aliases (names that may appear in older formulas) ===
  { ingredientName: 'CoQ10', typicalCapsuleMg: 100, typicalBottleCapsules: 60, typicalRetailPriceCents: 3499 },
  { ingredientName: 'Magnesium Glycinate', typicalCapsuleMg: 120, typicalBottleCapsules: 120, typicalRetailPriceCents: 2699 },
  { ingredientName: 'Omega-3 Fish Oil', typicalCapsuleMg: 1000, typicalBottleCapsules: 90, typicalRetailPriceCents: 3299 },
  { ingredientName: 'Vitamin D3', typicalCapsuleMg: 125, typicalBottleCapsules: 120, typicalRetailPriceCents: 1499 },
  { ingredientName: 'Vitamin K2', typicalCapsuleMg: 1, typicalBottleCapsules: 120, typicalRetailPriceCents: 2499 },
  { ingredientName: 'Alpha GPC', typicalCapsuleMg: 300, typicalBottleCapsules: 60, typicalRetailPriceCents: 3699 },
  { ingredientName: 'NAC', typicalCapsuleMg: 600, typicalBottleCapsules: 120, typicalRetailPriceCents: 2799 },
  { ingredientName: 'Berberine', typicalCapsuleMg: 500, typicalBottleCapsules: 90, typicalRetailPriceCents: 2899 },
  { ingredientName: 'Creatine Monohydrate', typicalCapsuleMg: 750, typicalBottleCapsules: 120, typicalRetailPriceCents: 2499 },
  { ingredientName: 'Methylated B Complex', typicalCapsuleMg: 500, typicalBottleCapsules: 60, typicalRetailPriceCents: 2599 },
  { ingredientName: 'Zinc Picolinate', typicalCapsuleMg: 30, typicalBottleCapsules: 120, typicalRetailPriceCents: 1399 },
  { ingredientName: 'Selenium', typicalCapsuleMg: 1, typicalBottleCapsules: 120, typicalRetailPriceCents: 1199 },
  { ingredientName: 'P5P', typicalCapsuleMg: 25, typicalBottleCapsules: 90, typicalRetailPriceCents: 1699 },
  { ingredientName: 'Methyl Folate', typicalCapsuleMg: 1, typicalBottleCapsules: 90, typicalRetailPriceCents: 1899 },
  { ingredientName: 'Methylcobalamin', typicalCapsuleMg: 1, typicalBottleCapsules: 90, typicalRetailPriceCents: 1799 },
  { ingredientName: 'Rhodiola Rosea', typicalCapsuleMg: 300, typicalBottleCapsules: 60, typicalRetailPriceCents: 2499 },
].map((row) => ({
  ingredientKey: key(row.ingredientName),
  ingredientName: row.ingredientName,
  typicalCapsuleMg: Math.max(1, Math.round(row.typicalCapsuleMg)),
  typicalBottleCapsules: row.typicalBottleCapsules,
  typicalRetailPriceCents: row.typicalRetailPriceCents,
  isActive: true,
}));

async function run() {
  for (const row of seedRows) {
    await db
      .insert(ingredientPricing)
      .values(row)
      .onConflictDoUpdate({
        target: ingredientPricing.ingredientKey,
        set: {
          ingredientName: row.ingredientName,
          typicalCapsuleMg: row.typicalCapsuleMg,
          typicalBottleCapsules: row.typicalBottleCapsules,
          typicalRetailPriceCents: row.typicalRetailPriceCents,
          isActive: true,
          updatedAt: new Date(),
        },
      });
  }

  console.log(`Seeded ingredient pricing rows: ${seedRows.length}`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed seeding ingredient pricing:', error);
    process.exit(1);
  });
