import React, { useRef, useEffect, memo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'TU_MAPBOX_TOKEN_AQUI';

interface MapProps {
  center: [number, number];
  userLocation: [number, number] | null;
}

interface Stop {
  lng: number;
  lat: number;
  nombre: string;
}

interface Route {
  id: string;
  polyline: [number, number][];
  color: string;
  tarifa: number;
  paradas: Stop[];
}

/**
 * Componente de Mapa optimizado.
 * Utiliza React.memo para evitar re-renderizados innecesarios.
 * Inicializa Mapbox una sola vez y actualiza el centro dinámicamente.
 */
const Map: React.FC<MapProps> = memo(({ center, userLocation }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);

  // Inicialización única del mapa
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

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

        if (!map.current) return;

        // Dibujar rutas
        (data.rutas as Route[]).forEach((ruta) => {
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
          ruta.paradas.forEach((parada) => {
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

    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo se ejecuta al montar

  // Actualizar el centro del mapa cuando cambie el prop center
  useEffect(() => {
    if (map.current) {
      map.current.flyTo({ center, zoom: 14, speed: 1.2 });
    }
  }, [center]);

  // Actualizar marcador de usuario
  useEffect(() => {
    if (userLocation && map.current) {
      // Eliminar marcador previo si existe
      if (userMarker.current) {
        userMarker.current.remove();
      }

      userMarker.current = new mapboxgl.Marker({ color: '#0EA5E9' })
        .setLngLat(userLocation)
        .setPopup(new mapboxgl.Popup().setHTML('Tu ubicación'))
        .addTo(map.current);
    }
  }, [userLocation]);

  return <div ref={mapContainer} className="w-full h-full min-h-[400px]" />;
});

export default Map;
