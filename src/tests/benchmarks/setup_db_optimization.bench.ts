import { bench, describe } from 'vitest';

const queries = [
    'CREATE TABLE IF NOT EXISTS mc_users (...)',
    'CREATE TABLE IF NOT EXISTS mc_telemetry (...)',
    'CREATE INDEX IF NOT EXISTS idx_telem_ts ON mc_telemetry(ts DESC)',
    'CREATE INDEX IF NOT EXISTS idx_telem_device ON mc_telemetry(device_id)',
    'CREATE INDEX IF NOT EXISTS idx_telem_stop ON mc_telemetry(nearest_stop)',
    'CREATE TABLE IF NOT EXISTS mc_stop_demand (...)',
    'CREATE TABLE IF NOT EXISTS mc_trips (...)',
    'CREATE INDEX IF NOT EXISTS idx_trips_device ON mc_trips(device_id)',
    'CREATE INDEX IF NOT EXISTS idx_trips_status ON mc_trips(status)',
    'CREATE TABLE IF NOT EXISTS mc_bus_occupancy (...)',
    'CREATE INDEX IF NOT EXISTS idx_occ_unit ON mc_bus_occupancy(unit_id, ts DESC)',
    'CREATE TABLE IF NOT EXISTS mc_shared_locations (...)',
    'CREATE INDEX IF NOT EXISTS idx_shared_exp ON mc_shared_locations(expires_at)',
    'CREATE TABLE IF NOT EXISTS mc_push_subs (...)',
    'CREATE INDEX IF NOT EXISTS idx_push_dev ON mc_push_subs(device_id)',
    'CREATE TABLE IF NOT EXISTS mc_heatmap_cache (...)'
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock SQL function with 50ms latency
const sqlMock = async (query: string) => {
    await sleep(50);
    return [];
};

describe('DB Setup Optimization', () => {
    bench('Sequential Execution (Current)', async () => {
        const results = [];
        for (const q of queries) {
            try {
                await sqlMock(q);
                results.push({ ok: true, q: q.slice(0, 60) });
            } catch (e: any) {
                results.push({ ok: false, q: q.slice(0, 60), err: e.message });
            }
        }
    }, { iterations: 10 });

    bench('Combined Execution (Optimized)', async () => {
        const combinedQuery = queries.join(';\n');
        const results = [];
        try {
            await sqlMock(combinedQuery);
            for (const q of queries) {
                results.push({ ok: true, q: q.slice(0, 60) });
            }
        } catch (e: any) {
            for (const q of queries) {
                results.push({ ok: false, q: q.slice(0, 60), err: e.message });
            }
        }
    }, { iterations: 10 });
});
