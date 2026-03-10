
const { performance } = require('perf_hooks');

/**
 * Mocks the behavior of IndexedDB operations with simulated delays.
 */
class MockIDB {
  constructor() {
    this.txOverhead = 1.5; // ms: overhead to start and commit a transaction
    this.opOverhead = 0.1; // ms: overhead for a single put operation
  }

  async simulatedDelay(ms) {
    return new Promise(resolve => {
      if (ms <= 0) return resolve();
      const start = performance.now();
      while (performance.now() - start < ms) {
        // Busy wait to simulate actual overhead/latency in a simple way
      }
      resolve();
    });
  }

  // Simulates sequential dbPut calls
  async dbPutSequential(items) {
    const start = performance.now();
    for (const item of items) {
      // Each dbPut opens its own transaction
      await this.simulatedDelay(this.txOverhead);
      await this.simulatedDelay(this.opOverhead);
    }
    return performance.now() - start;
  }

  // Simulates a single dbPutMany call
  async dbPutMany(items) {
    const start = performance.now();
    // One transaction for all items
    await this.simulatedDelay(this.txOverhead);
    for (const item of items) {
      await this.simulatedDelay(this.opOverhead);
    }
    // Commit overhead (usually happens at the end of tx)
    // In our model txOverhead covers start + commit
    return performance.now() - start;
  }
}

async function runBenchmark() {
  const idb = new MockIDB();
  const testSizes = [1, 5, 10, 20, 50];

  console.log('--- IndexedDB Batching Simulation ---');
  console.log('Simulating transaction overhead: ' + idb.txOverhead + 'ms');
  console.log('Simulating operation overhead: ' + idb.opOverhead + 'ms');
  console.log('');
  console.log('| Items | Sequential (ms) | Batch (ms) | Improvement |');
  console.log('|-------|-----------------|------------|-------------|');

  for (const size of testSizes) {
    const items = Array.from({ length: size }, (_, i) => ({ id: i }));

    const seqTime = await idb.dbPutSequential(items);
    const batchTime = await idb.dbPutMany(items);

    const improvement = ((seqTime - batchTime) / seqTime * 100).toFixed(1);

    console.log(`| ${size.toString().padEnd(5)} | ${seqTime.toFixed(2).toString().padEnd(15)} | ${batchTime.toFixed(2).toString().padEnd(10)} | ${improvement}%      |`);
  }
}

runBenchmark().catch(console.error);
