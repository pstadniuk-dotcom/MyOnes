import '../server/env';
import { labsService } from '../server/modules/labs/labs.service';

const dashboard = await labsService.getBiomarkersDashboard('907ad8a1-7db6-4b6c-8d69-d7fd5ad99454');
console.log('Markers:', dashboard.markers.length);
console.log('Summary:', JSON.stringify(dashboard.summary));
if (dashboard.markers.length > 0) {
  console.log('First 3 markers:');
  dashboard.markers.slice(0, 3).forEach(m => 
    console.log(' ', m.name, '=', m.latest.rawValue, m.latest.unit, '|', m.latest.status, '| trend:', m.trend)
  );
}
process.exit(0);
