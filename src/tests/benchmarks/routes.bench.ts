import { bench, describe } from 'vitest';
import { getAllRoutes } from '../../utils/routes';

describe('getAllRoutes performance', () => {
  bench('sequential/parallel getAllRoutes', async () => {
    await getAllRoutes();
  });
});
