import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface InteractiveMapProps {
  mapboxToken: string;
  center?: [number, number];
  zoom?: number;
}

export default function InteractiveMap({
  mapboxToken,
  center = [-86.8515, 21.1619], // Default: Cancún center
  zoom = 12
}: InteractiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: zoom,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add geolocate control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'top-right'
    );

    // Load routes when map loads
    map.current.on('load', async () => {
      try {
        const response = await fetch('/data/master_routes.json');
        const data = await response.json();

        // Add routes to map
        data.rutas.forEach((route: any) => {
          // If we have geometry, use it. Otherwise, we could draw lines between stops.
          if (route.geometry) {
            map.current!.addSource(`route-${route.id}`, {
              type: 'geojson',
              data: route.geometry
            });

            map.current!.addLayer({
              id: `route-${route.id}`,
              type: 'line',
              source: `route-${route.id}`,
              paint: {
                'line-color': route.color,
                'line-width': 4,
                'line-opacity': 0.8,
              }
            });
          } else if (route.paradas && route.paradas.length > 1) {
            // Fallback: draw straight lines between stops
            const coordinates = route.paradas.map((s: any) => [s.lng, s.lat]);
            map.current!.addSource(`route-${route.id}`, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: coordinates
                }
              }
            });

            map.current!.addLayer({
              id: `route-${route.id}`,
              type: 'line',
              source: `route-${route.id}`,
              paint: {
                'line-color': route.color,
                'line-width': 3,
                'line-opacity': 0.6,
                'line-dasharray': [2, 1]
              }
            });
          }

          // Add stops
          if (route.paradas) {
            route.paradas.forEach((stop: any) => {
              const el = document.createElement('div');
              el.className = 'stop-marker';
              el.style.backgroundColor = route.color;
              el.style.width = '10px';
              el.style.height = '10px';
              el.style.borderRadius = '50%';
              el.style.border = '2px solid white';
              el.style.cursor = 'pointer';

              new mapboxgl.Marker(el)
                .setLngLat([stop.lng, stop.lat])
                .setPopup(
                  new mapboxgl.Popup({ offset: 25 }).setHTML(`
                    <div class="p-2">
                      <strong class="text-deep-navy">${stop.nombre}</strong><br>
                      <span class="text-xs text-gray-500">Ruta: ${route.id}</span><br>
                      <span class="text-sm font-bold text-primary-600">$${route.tarifa.toFixed(2)} MXN</span>
                    </div>
                  `)
                )
                .addTo(map.current!);
            });
          }
        });

        setMapLoaded(true);
        console.log('✅ Map loaded with routes');
      } catch (error) {
        console.error('Failed to load routes:', error);
      }
    });

    return () => map.current?.remove();
  }, [mapboxToken, center, zoom]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl border border-gray-200 shadow-inner">
      <div ref={mapContainer} className="w-full h-full" />

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Cargando mapa de CancúnMueve...</p>
          </div>
        </div>
      )}
    </div>
  );
}
