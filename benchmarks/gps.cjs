const { performance } = require('perf_hooks');

// Helper: Current implementation
function deg2rad(deg) {
  return deg * (Math.PI/180)
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);
  var dLon = deg2rad(lon2-lon1);
  var a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ;
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c; // Distance in km
  return d;
}

function linearScan(userLat, userLon, db) {
    let minDist = Infinity;
    let nearest = '';
    Object.entries(db).forEach(([name, coords]) => {
        const d = getDistanceFromLatLonInKm(userLat, userLon, coords[0], coords[1]);
        if (d < minDist) {
            minDist = d;
            nearest = name;
        }
    });
    return nearest;
}

// Spatial Grid Implementation (Optimized)
class SpatialGrid {
    constructor(cellSize = 0.01) { // ~1.1km
        this.cellSize = cellSize;
        this.grid = new Map();
        this.allPoints = []; // Fallback
    }

    getKey(lat, lon) {
        const x = Math.floor(lat / this.cellSize);
        const y = Math.floor(lon / this.cellSize);
        return `${x},${y}`;
    }

    add(name, lat, lon) {
        const key = this.getKey(lat, lon);
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key).push({ name, lat, lon });
        this.allPoints.push({ name, lat, lon });
    }

    findNearest(lat, lon) {
        const centerKey = this.getKey(lat, lon);
        const [cx, cy] = centerKey.split(',').map(Number);

        let candidates = [];

        // Check 3x3 grid around user
        for (let x = cx - 1; x <= cx + 1; x++) {
            for (let y = cy - 1; y <= cy + 1; y++) {
                const key = `${x},${y}`;
                if (this.grid.has(key)) {
                    candidates.push(...this.grid.get(key));
                }
            }
        }

        // Fallback: If no candidates in immediate vicinity, scan all
        // (In production, you might spiral out, but for robustness in sparse maps, full scan is safe fallback)
        if (candidates.length === 0) {
            candidates = this.allPoints;
        }

        let minDist = Infinity;
        let nearest = '';

        for (const p of candidates) {
             const d = getDistanceFromLatLonInKm(lat, lon, p.lat, p.lon);
             if (d < minDist) {
                 minDist = d;
                 nearest = p.name;
             }
        }
        return nearest;
    }
}


// Generate Data
const N = 10000;
const DB = {};
const grid = new SpatialGrid();

console.log(`Generating ${N} random coordinates...`);
for(let i=0; i<N; i++) {
    // Random points around Cancun (approx 21.16, -86.82)
    const lat = 21.1 + Math.random() * 0.2; // 0.2 deg ~ 20km span
    const lon = -86.9 + Math.random() * 0.2;
    DB[`point_${i}`] = [lat, lon];
    grid.add(`point_${i}`, lat, lon);
}

// Ensure at least one point is very close to user to test accuracy
const userLat = 21.1605;
const userLon = -86.8205;
DB['TARGET'] = [21.1606, -86.8206]; // Very close
grid.add('TARGET', 21.1606, -86.8206);

// Run Baseline
console.log('Running Linear Scan...');
const startLinear = performance.now();
let linearResult = '';
for(let i=0; i<100; i++) { // Run 100 times
    linearResult = linearScan(userLat, userLon, DB);
}
const endLinear = performance.now();
const timeLinear = endLinear - startLinear;

// Run Optimized
console.log('Running Spatial Grid Search...');
const startGrid = performance.now();
let gridResult = '';
for(let i=0; i<100; i++) {
    gridResult = grid.findNearest(userLat, userLon);
}
const endGrid = performance.now();
const timeGrid = endGrid - startGrid;

console.log(`\nResults (100 iterations):`);
console.log(`Linear Scan: ${timeLinear.toFixed(2)}ms`);
console.log(`Spatial Grid: ${timeGrid.toFixed(2)}ms`);
console.log(`Speedup: ${(timeLinear / timeGrid).toFixed(1)}x`);
console.log(`Match? ${linearResult === gridResult ? 'YES' : 'NO'} (${linearResult} vs ${gridResult})`);
