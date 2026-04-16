#!/usr/bin/env node
/**
 * Crowdsource Route Processor
 * Analiza reportes de usuarios y genera/actualiza datos de rutas
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

interface LocationReport {
  userId: string;
  routeId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  type: 'bus' | 'stop';
  speed?: number;
  heading?: number;
}

interface RoutePoint {
  lat: number;
  lng: number;
  count: number;
  avgSpeed?: number;
}

interface ProcessedRoute {
  id: string;
  name: string;
  stops: RoutePoint[];
  path: RoutePoint[];
  contributors: number;
  lastUpdated: number;
}

console.log('🚌 Processing Crowdsourced Route Data...\n');

// Simular datos (en producción vendría de la API/DB)
const mockReports: LocationReport[] = generateMockReports();

function generateMockReports(): LocationReport[] {
  const reports: LocationReport[] = [];
  const routes = ['R1', 'R2', 'R27'];

  // Generar reportes simulados para demo
  routes.forEach(routeId => {
    // Simular 50 reportes por ruta
    for (let i = 0; i < 50; i++) {
      reports.push({
        userId: `user_${Math.random().toString(36).substr(2, 9)}`,
        routeId,
        latitude: 21.1619 + (Math.random() - 0.5) * 0.1,
        longitude: -86.8515 + (Math.random() - 0.5) * 0.1,
        accuracy: 10 + Math.random() * 20,
        timestamp: Date.now() - Math.random() * 3600000,
        type: Math.random() > 0.3 ? 'bus' : 'stop',
        speed: Math.random() * 30,
        heading: Math.random() * 360
      });
    }
  });

  return reports;
}

function processRouteData(reports: LocationReport[]): Map<string, ProcessedRoute> {
  const routesMap = new Map<string, ProcessedRoute>();

  // Group reports by route
  const byRoute = reports.reduce((acc, report) => {
    if (!acc[report.routeId]) acc[report.routeId] = [];
    acc[report.routeId].push(report);
    return acc;
  }, {} as Record<string, LocationReport[]>);

  Object.entries(byRoute).forEach(([routeId, routeReports]) => {
    // Separate stops and path points
    const stops = routeReports.filter(r => r.type === 'stop');
    const pathPoints = routeReports.filter(r => r.type === 'bus');

    // Cluster stops (points within 50m radius)
    const clusteredStops = clusterPoints(stops, 50);

    // Create path from bus reports
    const pathClusters = clusterPoints(pathPoints, 30);

    // Get unique contributors
    const contributors = new Set(routeReports.map(r => r.userId)).size;

    routesMap.set(routeId, {
      id: routeId,
      name: `Ruta ${routeId}`,
      stops: clusteredStops,
      path: pathClusters,
      contributors,
      lastUpdated: Date.now()
    });
  });

  return routesMap;
}

function clusterPoints(points: LocationReport[], radiusMeters: number): RoutePoint[] {
  const clusters: RoutePoint[] = [];
  const used = new Set<number>();

  points.forEach((point, i) => {
    if (used.has(i)) return;

    const cluster: LocationReport[] = [point];
    used.add(i);

    // Find nearby points
    points.forEach((other, j) => {
      if (used.has(j)) return;

      const distance = calculateDistance(
        point.latitude,
        point.longitude,
        other.latitude,
        other.longitude
      );

      if (distance <= radiusMeters) {
        cluster.push(other);
        used.add(j);
      }
    });

    // Calculate cluster center and stats
    const avgLat = cluster.reduce((sum, p) => sum + p.latitude, 0) / cluster.length;
    const avgLng = cluster.reduce((sum, p) => sum + p.longitude, 0) / cluster.length;
    const speeds = cluster.filter(p => p.speed !== undefined).map(p => p.speed!);
    const avgSpeed = speeds.length > 0
      ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length
      : undefined;

    clusters.push({
      lat: avgLat,
      lng: avgLng,
      count: cluster.length,
      avgSpeed
    });
  });

  return clusters;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function generateRouteGeoJSON(route: ProcessedRoute): any {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id: route.id,
          name: route.name,
          contributors: route.contributors,
          lastUpdated: route.lastUpdated,
          type: 'route_path'
        },
        geometry: {
          type: 'LineString',
          coordinates: route.path.map(p => [p.lng, p.lat])
        }
      },
      ...route.stops.map((stop, idx) => ({
        type: 'Feature',
        properties: {
          id: `${route.id}_stop_${idx}`,
          routeId: route.id,
          name: `Parada ${idx + 1}`,
          reports: stop.count,
          type: 'stop'
        },
        geometry: {
          type: 'Point',
          coordinates: [stop.lng, stop.lat]
        }
      }))
    ]
  };
}

// Process reports
const processedRoutes = processRouteData(mockReports);

console.log('📊 Processing Results:\n');

processedRoutes.forEach(route => {
  console.log(`Route ${route.id}:`);
  console.log(`  - ${route.stops.length} stops identified`);
  console.log(`  - ${route.path.length} path points`);
  console.log(`  - ${route.contributors} contributors`);

  // Generate GeoJSON
  const geojson = generateRouteGeoJSON(route);
  const outputPath = path.join(rootDir, 'public/data/crowdsourced', `${route.id}.geojson`);

  // Create directory if doesn't exist
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
  console.log(`  ✅ Saved: ${outputPath}\n`);
});

// Generate summary
const summary = {
  totalRoutes: processedRoutes.size,
  totalStops: Array.from(processedRoutes.values()).reduce((sum, r) => sum + r.stops.length, 0),
  totalPathPoints: Array.from(processedRoutes.values()).reduce((sum, r) => sum + r.path.length, 0),
  totalContributors: new Set(mockReports.map(r => r.userId)).size,
  lastProcessed: Date.now(),
  routes: Array.from(processedRoutes.values()).map(r => ({
    id: r.id,
    name: r.name,
    stops: r.stops.length,
    contributors: r.contributors
  }))
};

const summaryPath = path.join(rootDir, 'public/data/crowdsourced/summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

console.log('✅ Summary saved:', summaryPath);
console.log('\n📈 Total Statistics:');
console.log(`  - Routes: ${summary.totalRoutes}`);
console.log(`  - Stops: ${summary.totalStops}`);
console.log(`  - Path Points: ${summary.totalPathPoints}`);
console.log(`  - Contributors: ${summary.totalContributors}`);

console.log('\n✨ Crowdsource processing complete!');
console.log('\nNext steps:');
console.log('  1. Review generated GeoJSON files in public/data/crowdsourced/');
console.log('  2. Merge high-confidence data into master_routes.json');
console.log('  3. Deploy updated routes to production');
