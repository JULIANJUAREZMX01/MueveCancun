import React, { useRef, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { BusStopMarker, UserMarker } from './CustomMarkers';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'TU_MAPBOX_TOKEN_AQUI';

interface MapProps {
  center: [number, number];
  userLocation: [number, number] | null;
}

const Map: React.FC<MapProps> = ({ center, userLocation }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const userMarkerRootRef = useRef<Root | null>(null);
  const stopMarkersRef = useRef<{marker: mapboxgl.Marker, root: Root}[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: 12
    });

    map.current.addControl(new mapboxgl.NavigationControl());
    map.current.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true
    }));

    map.current.on('load', async () => {
      try {
        const response = await fetch('/data/routes.json');
        const data = await response.json();

        data.routes.forEach((route: any) => {
          const coordinates = route.stops.map((stop: any) => [stop.lng, stop.lat]);

          map.current?.addSource(`route-${route.id}`, {
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

          map.current?.addLayer({
            id: `route-${route.id}`,
            type: 'line',
            source: `route-${route.id}`,
            paint: {
              'line-color': route.color,
              'line-width': 4,
              'line-opacity': 0.8
            }
          });

          route.stops.forEach((stop: any) => {
            const el = document.createElement('div');
            const root = createRoot(el);
            root.render(<BusStopMarker />);

            const marker = new mapboxgl.Marker(el)
              .setLngLat([stop.lng, stop.lat])
              .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div class="p-2 font-outfit">
                  <strong class="text-deep-navy">${stop.name}</strong><br>
                  <span class="text-caribbean-blue text-xs font-bold">Ruta: ${route.id}</span>
                </div>
              `))
              .addTo(map.current!);

            stopMarkersRef.current.push({ marker, root });
          });
        });
      } catch (error) {
        console.error('Error loading routes to map:', error);
      }
    });

    return () => {
      stopMarkersRef.current.forEach(({ marker, root }) => {
        marker.remove();
        root.unmount();
      });
      stopMarkersRef.current = [];
      map.current?.remove();
    };
  }, [center]);

  // Update user location marker
  useEffect(() => {
    if (userLocation && map.current) {
      if (!userMarkerRef.current) {
        const el = document.createElement('div');
        userMarkerRootRef.current = createRoot(el);
        userMarkerRootRef.current.render(<UserMarker />);

        userMarkerRef.current = new mapboxgl.Marker(el)
          .setLngLat(userLocation)
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<strong class="p-2 block">Tu ubicación</strong>'))
          .addTo(map.current);
      } else {
        userMarkerRef.current.setLngLat(userLocation);
      }
    }
  }, [userLocation]);

  return <div ref={mapContainer} className="w-full h-full" />;
};

export default Map;
