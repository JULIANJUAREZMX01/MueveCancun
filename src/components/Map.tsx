import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'TU_MAPBOX_TOKEN_AQUI';

interface Parada {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  orden: number;
  referencias: string;
}

interface Ruta {
  id: string;
  nombre: string;
  color: string;
  tarifa: number;
  horario: string;
  frecuencia_minutos: number;
  paradas: Parada[];
  polyline: [number, number][];
}

interface MapProps {
  center: [number, number];
  userLocation: [number, number] | null;
}

const Map: React.FC<MapProps> = React.memo(({ center, userLocation }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: 12
    });

    // Agregar controles
    map.current.addControl(new mapboxgl.NavigationControl());
    map.current.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true
    }));

    // Cargar rutas desde routes.json
    map.current.on('load', async () => {
      try {
        const response = await fetch('/data/routes.json');
        const data = await response.json();

        // Dibujar rutas
        data.rutas.forEach((ruta: Ruta) => {
          map.current?.addSource(`route-${ruta.id}`, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: ruta.polyline
              }
            }
          });

          map.current?.addLayer({
            id: `route-${ruta.id}`,
            type: 'line',
            source: `route-${ruta.id}`,
            paint: {
              'line-color': ruta.color,
              'line-width': 4
            }
          });

          // Agregar paradas
          ruta.paradas.forEach((parada: Parada) => {
            new mapboxgl.Marker({ color: ruta.color })
              .setLngLat([parada.lng, parada.lat])
              .setPopup(new mapboxgl.Popup().setHTML(`
                <strong>${parada.nombre}</strong><br>
                Ruta: ${ruta.id}<br>
                Tarifa: $${ruta.tarifa} MXN
              `))
              .addTo(map.current!);
          });
        });
      } catch (error) {
        console.error('Error loading routes to map:', error);
      }
    });

    return () => map.current?.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo inicializar una vez

  // Actualizar centro del mapa cuando cambie el prop center
  useEffect(() => {
    if (map.current) {
      map.current.jumpTo({ center });
    }
  }, [center]);

  // Actualizar marcador de usuario
  useEffect(() => {
    if (userLocation && map.current) {
      if (userMarker.current) {
        userMarker.current.setLngLat(userLocation);
      } else {
        userMarker.current = new mapboxgl.Marker({ color: '#0EA5E9' })
          .setLngLat(userLocation)
          .setPopup(new mapboxgl.Popup().setHTML('Tu ubicación'))
          .addTo(map.current);
      }
    }
  }, [userLocation]);

  return <div ref={mapContainer} className="w-full h-full min-h-[400px]" />;
});

export default Map;
