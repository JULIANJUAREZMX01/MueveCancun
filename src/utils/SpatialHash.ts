/**
 * A simple grid-based spatial index (Spatial Hash) for fast 2D point queries.
 * Much faster than linear scan for finding nearest neighbors in larger datasets.
 *
 * Performance: O(1) average case query time.
 * Accuracy: Guaranteed to find points within (cellSize) of the query point,
 * provided the search radius is handled correctly by checking neighbors.
 */
export class SpatialHash<T> {
  private cellSize: number;
  private grid: Map<string, Array<{ lat: number; lng: number; data: T }>>;

  /**
   * @param cellSize - The size of each grid cell in degrees.
   * Default 0.01 degrees is roughly 1.1km at equator, suitable for city-scale bus stops.
   */
  constructor(cellSize: number = 0.01) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  private getKey(lat: number, lng: number): string {
    const x = Math.floor(lng / this.cellSize);
    const y = Math.floor(lat / this.cellSize);
    return `${x},${y}`;
  }

  /**
   * Insert a point into the index.
   */
  insert(lat: number, lng: number, data: T): void {
    const key = this.getKey(lat, lng);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key)!.push({ lat, lng, data });
  }

  /**
   * Query for points in the cell containing (lat, lng) and its 8 neighbors.
   * This covers a 3x3 grid area centered on the query point's cell.
   */
  query(lat: number, lng: number): Array<{ lat: number; lng: number; data: T }> {
    const x = Math.floor(lng / this.cellSize);
    const y = Math.floor(lat / this.cellSize);
    let results: Array<{ lat: number; lng: number; data: T }> = [];

    // Check 3x3 neighbors to ensure edge cases are handled
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${x + dx},${y + dy}`;
        const cell = this.grid.get(key);
        if (cell) {
          // Micro-optimization: Use a loop or spread? Spread is fine for small cell contents.
          // Concat is generally safe.
          for (let i = 0; i < cell.length; i++) {
             results.push(cell[i]);
          }
        }
      }
    }
    return results;
  }

  /**
   * Clears the index
   */
  clear(): void {
      this.grid.clear();
  }
}
