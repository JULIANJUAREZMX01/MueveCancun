import { describe, expect, it } from 'vitest';
import { areStubsEnabled, createTrackingPayload } from '../pages/api/tracking';

const liveUnit = {
  id: 'real-r1-01',
  route_id: 'R1',
  lat: 21.1714,
  lng: -86.8219,
  speed_kmh: 32,
  heading: 90,
  stop_name: 'El Crucero',
  updated_at: '2026-06-07T12:00:00.000Z',
};

describe('/api/tracking response modes', () => {
  it('returns live metadata and only real units when DB data is available for a route', () => {
    const response = createTrackingPayload([liveUnit], 'R1', 'available', true);

    expect(response.mode).toBe('live');
    expect(response.meta).toMatchObject({ database: 'available', live_units: 1, demo_units: 0, stubs_enabled: true });
    expect(response.units).toEqual([expect.objectContaining({ id: 'real-r1-01', source: 'live', is_stub: false })]);
  });

  it('returns demo metadata and clearly marked stubs when the DB is empty', () => {
    const response = createTrackingPayload([], 'R1', 'available', true);

    expect(response.mode).toBe('demo');
    expect(response.meta).toMatchObject({ database: 'available', live_units: 0, demo_units: 3, stubs_enabled: true });
    expect(response.units).toHaveLength(3);
    expect(response.units.every(unit => unit.source === 'demo' && unit.is_stub)).toBe(true);
  });

  it('returns offline with no units when the DB is unavailable and production stubs are disabled', () => {
    const response = createTrackingPayload([], 'R1', 'unavailable', false);

    expect(response.mode).toBe('offline');
    expect(response.units).toEqual([]);
    expect(response.meta).toMatchObject({ database: 'unavailable', live_units: 0, demo_units: 0, stubs_enabled: false });
  });

  it('returns mixed and labels every source when live and demo units coexist', () => {
    const response = createTrackingPayload([liveUnit], '', 'available', true);

    expect(response.mode).toBe('mixed');
    expect(response.meta.live_units).toBe(1);
    expect(response.meta.demo_units).toBeGreaterThan(0);
    expect(new Set(response.units.map(unit => unit.source))).toEqual(new Set(['live', 'demo']));
  });
  it('requires explicit opt-in before enabling demo tracking units', () => {
    expect(areStubsEnabled(undefined)).toBe(false);
    expect(areStubsEnabled('false')).toBe(false);
    expect(areStubsEnabled('true')).toBe(true);
  });

});
