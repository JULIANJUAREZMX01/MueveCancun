import fs from 'node:fs/promises';
import path from 'node:path';

async function sync() {
    console.log("🚀 Syncing routes data...");
    
    // 1. Read source
    const sourcePath = path.resolve('src/data/routes.json');
    const sourceContent = await fs.readFile(sourcePath, 'utf-8');
    const sourceData = JSON.parse(sourceContent);
    
    // 2. Prepare master routes for search/catalog
    // We only need basic info for the master list
    const masterRoutes = {
        version: sourceData.version,
        rutas: sourceData.rutas.map(r => ({
            id: r.id,
            nombre: r.nombre,
            tarifa: r.tarifa,
            tipo: r.tipo_transporte || "Transporte",
            empresa: r.empresa || r.empresas?.[0],
            frecuencia_minutos: r.frecuencia_minutos,
            horario: typeof r.horario === 'string' ? { inicio_oficial: r.horario } : r.horario,
            social_alerts: r.advertencias_usuario || [],
            last_updated: sourceData.metadata?.normalization_date || new Date().toISOString(),
            paradas: r.paradas.map(p => ({
                id: p.id,
                nombre: p.nombre || p.parada,
                lat: p.lat,
                lng: p.lng,
                orden: p.orden,
                landmarks: p.advertencia || p.referencias
            }))
        }))
    };

    // 3. Write public files
    const publicPath = path.resolve('public/data');
    await fs.mkdir(publicPath, { recursive: true });
    
    // Master Registry
    await fs.writeFile(
        path.join(publicPath, 'master_routes.json'), 
        JSON.stringify(masterRoutes, null, 2)
    );
    
    // Individual Route Files (Modular for lazy loading)
    const routesDir = path.join(publicPath, 'routes');
    await fs.mkdir(routesDir, { recursive: true });
    
    for (const route of masterRoutes.rutas) {
        await fs.writeFile(
            path.join(routesDir, `${route.id}.json`),
            JSON.stringify(route, null, 2)
        );
    }
    
    console.log(`✅ Synced ${masterRoutes.rutas.length} routes to public/data/`);
}

sync().catch(console.error);
