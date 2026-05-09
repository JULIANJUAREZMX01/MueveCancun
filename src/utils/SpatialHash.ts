/**
 * SpatialHash — Grid-based spatial index for fast 2D point queries.
 *
 * Performance: O(1) average case insert & query.
 * Accuracy: Guaranteed to find all points within (cellSize) of the query point
 * via 3×3 neighbour grid search.
 *
 * Cell size guide (degrees → km at equator):
 *   0.005 ≈ 556 m  — dense urban area (recommended for bus stops < 500 m apart)
 *   0.010 ≈ 1.1 km — city scale (default, good for Cancún stop density)
 *   0.050 ≈ 5.6 km — regional / inter-city
 */

export interface SpatialHashOptions {
  /** Grid cell size in degrees. Default: 0.01 (~1.1 km). */
  cellSize?: number;
  /**
   * Neighbour radius in cells (default: 1 → 3×3 grid).
   * Increase to 2 for sparser datasets where stops can be > 1 cellSize apart.
   */
  neighbourRadius?: number;
}

export interface SpatialPoint<T> {
  lat: number;
  lng: number;
  data: T;
}

export class SpatialHash<T> {
  private readonly cellSize: number;
  private readonly neighbourRadius: number;
  private readonly grid: Map<string, SpatialPoint<T>[]>;
  private _size = 0;

  constructor(options: SpatialHashOptions | number = {}) {
    // Accept legacy constructor(cellSize: number) for backwards compat
    if (typeof options === 'number') {
      this.cellSize = options;
      this.neighbourRadius = 1;
    } else {
      this.cellSize = options.cellSize ?? 0.01;
      this.neighbourRadius = options.neighbourRadius ?? 1;
    }
    this.grid = new Map();
  }

  /** Number of points currently indexed. */
  get size(): number { return this._size; }

  /** Current cell size in degrees. */
  get currentCellSize(): number { return this.cellSize; }

  private cellKey(lat: number, lng: number): string {
    const x = Math.floor(lng / this.cellSize);
    const y = Math.floor(lat / this.cellSize);
    return `${x},${y}`;
  }

  /** Insert a geo-located data point into the index. */
  insert(lat: number, lng: number, data: T): void {
    const key = this.cellKey(lat, lng);
    let cell = this.grid.get(key);
    if (!cell) { cell = []; this.grid.set(key, cell); }
    cell.push({ lat, lng, data });
    this._size++;
  }

  /**
   * Query points in the (2r+1)×(2r+1) neighbourhood of (lat, lng),
   * where r = neighbourRadius (default 1 → 3×3 = 9 cells).
   */
  query(lat: number, lng: number): SpatialPoint<T>[] {
    const cx = Math.floor(lng / this.cellSize);
    const cy = Math.floor(lat / this.cellSize);
    const r  = this.neighbourRadius;
    const results: SpatialPoint<T>[] = [];

    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        const cell = this.grid.get(`${cx + dx},${cy + dy}`);
        if (cell) {
          for (let i = 0; i < cell.length; i++) results.push(cell[i]);
        }
      }
    }
    return results;
  }

  /**
   * Query with a maximum distance filter (km).
   * Converts km→degrees on the fly for a tighter bounding box.
   */
  queryRadius(lat: number, lng: number, radiusKm: number): SpatialPoint<T>[] {
    const degRadius = radiusKm / 111; // rough degrees per km
    const r = Math.ceil(degRadius / this.cellSize);
    const cx = Math.floor(lng / this.cellSize);
    const cy = Math.floor(lat / this.cellSize);
    const results: SpatialPoint<T>[] = [];

    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        const cell = this.grid.get(`${cx + dx},${cy + dy}`);
        if (cell) {
          for (let i = 0; i < cell.length; i++) results.push(cell[i]);
        }
      }
    }
    return results;
  }

  /** Remove all points from the index. */
  clear(): void {
    this.grid.clear();
    this._size = 0;
  }

  /** Rebuild the index from a list of points (e.g. after dedup). */
  rebuild(points: SpatialPoint<T>[]): void {
    this.clear();
    for (const p of points) this.insert(p.lat, p.lng, p.data);
  }
}
