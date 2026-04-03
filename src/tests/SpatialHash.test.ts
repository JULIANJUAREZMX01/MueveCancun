import { describe, it, expect } from 'vitest';
import { SpatialHash } from '../utils/SpatialHash';

describe('SpatialHash', () => {
  it('should create an instance with default cell size', () => {
    const spatialHash = new SpatialHash();
    expect(spatialHash).toBeDefined();
    // Access private property for testing
    expect((spatialHash as any).cellSize).toBe(0.01);
  });

  it('should create an instance with custom cell size', () => {
    const spatialHash = new SpatialHash(0.05);
    expect(spatialHash).toBeDefined();
    expect((spatialHash as any).cellSize).toBe(0.05);
  });

  it('should insert and retrieve a point', () => {
    const spatialHash = new SpatialHash<string>();
    spatialHash.insert(10, 20, 'Point A');
    const results = spatialHash.query(10, 20);
    expect(results).toHaveLength(1);
    expect(results[0].data).toBe('Point A');
    expect(results[0].lat).toBe(10);
    expect(results[0].lng).toBe(20);
  });

  it('should retrieve points from neighboring cells', () => {
    const cellSize = 1.0;
    const spatialHash = new SpatialHash<string>(cellSize);

    // Center point (10.5, 10.5) is in cell (10, 10)
    spatialHash.insert(10.5, 10.5, 'Center');

    // Neighbors
    // (11, 10)
    spatialHash.insert(11.5, 10.5, 'North');
    // (9, 10)
    spatialHash.insert(9.5, 10.5, 'South');
    // (10, 11)
    spatialHash.insert(10.5, 11.5, 'East');
    // (10, 9)
    spatialHash.insert(10.5, 9.5, 'West');
    // (11, 11)
    spatialHash.insert(11.5, 11.5, 'NE');
    // (11, 9)
    spatialHash.insert(11.5, 9.5, 'NW');
    // (9, 11)
    spatialHash.insert(9.5, 11.5, 'SE');
    // (9, 9)
    spatialHash.insert(9.5, 9.5, 'SW');

    // Query center (10.5, 10.5)
    const results = spatialHash.query(10.5, 10.5);

    // Should return all 9 points (center + 8 neighbors)
    expect(results).toHaveLength(9);
    const names = results.map(r => r.data).sort();
    expect(names).toEqual(['Center', 'East', 'NE', 'NW', 'North', 'SE', 'SW', 'South', 'West'].sort());
  });

  it('should NOT retrieve points outside the 3x3 grid', () => {
    const cellSize = 1.0;
    const spatialHash = new SpatialHash<string>(cellSize);

    spatialHash.insert(10.5, 10.5, 'Center'); // (10, 10)
    spatialHash.insert(12.5, 10.5, 'Far North'); // (12, 10) - outside checks (11,10), (10,10), (9,10)
    spatialHash.insert(10.5, 12.5, 'Far East');  // (10, 12) - outside

    const results = spatialHash.query(10.5, 10.5);
    expect(results).toHaveLength(1);
    expect(results[0].data).toBe('Center');
  });

  it('should handle multiple points in the same cell', () => {
    const spatialHash = new SpatialHash<string>();
    spatialHash.insert(10, 20, 'Point A');
    spatialHash.insert(10.001, 20.001, 'Point B');

    const results = spatialHash.query(10, 20);
    expect(results).toHaveLength(2);
    const names = results.map(r => r.data).sort();
    expect(names).toEqual(['Point A', 'Point B']);
  });

  it('should handle negative coordinates', () => {
    const spatialHash = new SpatialHash<string>();
    spatialHash.insert(-10, -20, 'Negative Point');

    const results = spatialHash.query(-10, -20);
    expect(results).toHaveLength(1);
    expect(results[0].data).toBe('Negative Point');
  });

  it('should handle coordinates near 0,0', () => {
    const spatialHash = new SpatialHash<string>();
    spatialHash.insert(0, 0, 'Origin');
    spatialHash.insert(0.001, 0.001, 'Near Origin');
    spatialHash.insert(-0.001, -0.001, 'Negative Near Origin');

    const results = spatialHash.query(0, 0);
    expect(results).toHaveLength(3);
  });

  it('should clear all data', () => {
      const spatialHash = new SpatialHash<string>();
      spatialHash.insert(10, 20, 'Point A');
      expect(spatialHash.query(10, 20)).toHaveLength(1);

      spatialHash.clear();
      expect(spatialHash.query(10, 20)).toHaveLength(0);
  });
});
