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
  const [error, setError] = useState<string | null>(null);
  const [centerLng, centerLat] = center;

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
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (!map.current) return;

        // Add routes to map
        data.routes.forEach((route: any) => {
          if (!map.current) return;

          // Add route line
          map.current.addSource(`route-${route.id}`, {
            type: 'geojson',
            data: route.geometry
          });

          map.current.addLayer({
            id: `route-${route.id}`,
            type: 'line',
            source: `route-${route.id}`,
            paint: {
              'line-color': route.color,
              'line-width': 4,
              'line-opacity': 0.8,
            }
          });

          // Add stops
          route.stops.forEach((stop: any) => {
            if (!map.current) return;
            const el = document.createElement('div');
            el.className = 'stop-marker';
            el.style.backgroundColor = route.color;
            el.style.width = '12px';
            el.style.height = '12px';
            el.style.borderRadius = '50%';
            el.style.border = '2px solid white';
            el.style.cursor = 'pointer';

              const popupContainer = document.createElement('div');
              const nameEl = document.createElement('strong');
              nameEl.textContent = stop.name;
              popupContainer.appendChild(nameEl);
              popupContainer.appendChild(document.createElement('br'));
              popupContainer.appendChild(document.createTextNode(`Ruta: ${route.id}`));
              popupContainer.appendChild(document.createElement('br'));
              popupContainer.appendChild(document.createTextNode(`Tarifa: $${route.fare_mxn ?? 0} MXN`));

              new mapboxgl.Marker(el)
                .setLngLat(stop.location.coordinates)
                .setPopup(
                  new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupContainer)
                )
              .addTo(map.current);
          });
        });

        setMapLoaded(true);
        console.log('✅ Map loaded with routes');
      } catch (err: any) {
        console.error('Failed to load routes:', err);
        setError(err.message || String(err));
        setMapLoaded(true);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken, centerLng, centerLat, zoom]);

  return (
    <div className="relative w-full h-96 sunny-card overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando mapa...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 p-4">
          <div className="text-center">
            <span className="text-4xl mb-4 block">⚠️</span>
            <p className="text-red-700 font-bold mb-2">Error al cargar rutas</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
