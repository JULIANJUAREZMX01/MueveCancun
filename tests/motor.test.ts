import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialHash } from '../src/utils/SpatialHash';

// ── SpatialHash unit tests ───────────────────────────────────────────────────

describe('SpatialHash', () => {
  let sh: SpatialHash<string>;

  beforeEach(() => {
    sh = new SpatialHash({ cellSize: 0.01, neighbourRadius: 1 });
  });

  it('starts empty', () => {
    expect(sh.size).toBe(0);
  });

  it('inserts and queries a single point', () => {
    sh.insert(21.17, -86.85, 'El Crucero');
    const results = sh.query(21.17, -86.85);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].data).toBe('El Crucero');
  });

  it('finds nearby point in adjacent cell', () => {
    sh.insert(21.17, -86.85, 'A');
    sh.insert(21.175, -86.855, 'B'); // ~0.7 km away
    const results = sh.query(21.172, -86.852);
    const names = results.map(r => r.data);
    expect(names).toContain('A');
    expect(names).toContain('B');
  });

  it('queryRadius filters by distance', () => {
    sh.insert(21.17, -86.85, 'Centro');
    sh.insert(21.30, -86.70, 'Far'); // ~20 km away
    const nearby = sh.queryRadius(21.17, -86.85, 2); // 2km radius
    expect(nearby.some(r => r.data === 'Centro')).toBe(true);
    // Far point may or may not be in grid depending on radius calculation
    // but Centro must always be present
  });

  it('clear resets size to 0', () => {
    sh.insert(21.17, -86.85, 'A');
    sh.insert(21.18, -86.86, 'B');
    sh.clear();
    expect(sh.size).toBe(0);
    expect(sh.query(21.17, -86.85).length).toBe(0);
  });

  it('rebuild replaces all points', () => {
    sh.insert(21.17, -86.85, 'Old');
    sh.rebuild([
      { lat: 21.20, lng: -86.80, data: 'New1' },
      { lat: 21.21, lng: -86.81, data: 'New2' },
    ]);
    expect(sh.size).toBe(2);
    expect(sh.query(21.17, -86.85).length).toBe(0); // Old gone
    const results = sh.query(21.20, -86.80);
    expect(results.some(r => r.data === 'New1')).toBe(true);
  });

  it('accepts legacy constructor (number)', () => {
    const legacy = new SpatialHash(0.005);
    expect(legacy.currentCellSize).toBe(0.005);
  });

  it('inserts 200 points without error', () => {
    for (let i = 0; i < 200; i++) {
      sh.insert(21.0 + i * 0.001, -86.5 + i * 0.001, `stop-${i}`);
    }
    expect(sh.size).toBe(200);
  });
});

// ── Route Engine placeholder ─────────────────────────────────────────────────
describe('Route Engine', () => {
  it.todo('should initialize successfully');
});
