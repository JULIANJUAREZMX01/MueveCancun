import { bench, describe, beforeAll, afterAll } from 'vitest';
import { getAllRoutes } from '../../utils/routes.ts';
import fs from 'node:fs/promises';
import path from 'node:path';

describe('getAllRoutes benchmark', () => {
  const testDir = path.resolve('./public/data/routes');

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
    // create 100 dummy files
    for (let i = 0; i < 100; i++) {
      const data = {
        rutas: [
          {
            id: `test-route-${i}`,
            nombre: `Test Route ${i}`,
            tarifa: 10,
            paradas: []
          }
        ]
      };
      await fs.writeFile(path.join(testDir, `test-route-${i}.json`), JSON.stringify(data));
    }
  });

  afterAll(async () => {
    // clean up dummy files
    for (let i = 0; i < 100; i++) {
      await fs.unlink(path.join(testDir, `test-route-${i}.json`)).catch(() => {});
    }
  });

  bench('getAllRoutes', async () => {
    await getAllRoutes();
  });
});
