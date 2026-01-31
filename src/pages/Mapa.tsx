import React from 'react';
import { Link } from 'react-router-dom';
import Map from '../components/Map';

const MapaPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-deep-navy">Mapa de Red</h2>
        <Link to="/" className="text-caribbean-blue hover:underline text-sm">← Volver al buscador</Link>
      </div>
      <div className="flex-1 min-h-[500px] rounded-xl overflow-hidden shadow-inner border border-gray-200">
        <Map center={[-86.8515, 21.1619]} userLocation={null} />
      </div>
    </div>
  );
};

export default MapaPage;
