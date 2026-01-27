import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = 'pk.eyJ1Ijoiam9zZWFudG9uaW9tdW5veiIsImEiOiJjbTllZzZ6ZzAwMHBpMnFzYm1zZzZ6ZzAwIn0.placeholder'; 

interface MapProps {
  center?: [number, number];
  zoom?: number;
  routes?: any[];
}

const Map: React.FC<MapProps> = ({ center = [-86.8515, 21.1619], zoom = 12, routes = [] }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current) return;
    if (mapContainer.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: center,
        zoom: zoom
      });
    }
  }, [center, zoom]);

  useEffect(() => {
    if (!map.current) return;
    routes.forEach(route => {
        route.paradas.forEach((parada: any) => {
            new mapboxgl.Marker({ color: route.color })
                .setLngLat([parada.lng, parada.lat])
                .setPopup(new mapboxgl.Popup().setHTML(`<h3>${parada.nombre}</h3><p>Ruta: ${route.nombre}</p>`))
                .addTo(map.current!);
        });
    });
  }, [routes]);

  return <div ref={mapContainer} className="w-full h-full min-h-[400px]" />;
};

export default Map;
