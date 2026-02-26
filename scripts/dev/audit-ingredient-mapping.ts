import dotenv from 'dotenv';
import { ALL_INGREDIENTS } from '../../shared/ingredients';

dotenv.config();
dotenv.config({ path: 'server/.env' });

async function run() {
  const { manufacturerPricingService } = await import('../../server/modules/formulas/manufacturer-pricing.service');
  const ingredientNames = ALL_INGREDIENTS.map((ingredient) => ingredient.name);
  const report = await manufacturerPricingService.auditCatalogMappings(ingredientNames);

  if (!report.available) {
    console.log('Manufacturer mapping audit unavailable:', report.reason);
    console.log(`Checked ${report.total} ingredient names locally.`);
    process.exitCode = 2;
    return;
  }

  console.log('Manufacturer mapping audit complete');
  console.log(`Total: ${report.total}`);
  console.log(`Mapped: ${report.mappedCount}`);
  console.log(`Unmapped: ${report.unmappedCount}`);
  console.log(`Coverage: ${report.coveragePercent}%`);

  if (report.unmapped.length > 0) {
    console.log('\nUnmapped ingredients:');
    for (const name of report.unmapped) {
      console.log(`- ${name}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('\nAll ingredients are mapped.');
}

run().catch((error) => {
  console.error('Mapping audit failed:', error);
  process.exitCode = 1;
});
