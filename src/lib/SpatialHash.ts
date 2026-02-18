export interface SpatialPoint<T> {
  lat: number;
  lng: number;
  data: T;
}

export class SpatialHash<T> {
  private cellSize: number;
  private grid: Map<string, SpatialPoint<T>[]>;

  constructor(cellSize: number = 0.01) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  private getKey(lat: number, lng: number): string {
    const x = Math.floor(lng / this.cellSize);
    const y = Math.floor(lat / this.cellSize);
    return `${x},${y}`;
  }

  public insert(lat: number, lng: number, data: T): void {
    const key = this.getKey(lat, lng);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key)!.push({ lat, lng, data });
  }

  public query(lat: number, lng: number): SpatialPoint<T>[] {
    const x = Math.floor(lng / this.cellSize);
    const y = Math.floor(lat / this.cellSize);
    const results: SpatialPoint<T>[] = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${x + dx},${y + dy}`;
        const cell = this.grid.get(key);
        if (cell) {
          results.push(...cell);
        }
      }
    }
    return results;
  }

  public clear(): void {
    this.grid.clear();
  }
}
