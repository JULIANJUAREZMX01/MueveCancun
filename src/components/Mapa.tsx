import React from 'react';
import { Map as MapIcon } from 'lucide-react';

const Mapa: React.FC = () => {
  return (
    <div className="sunny-card p-8 text-center space-y-4">
      <div className="bg-sky-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-sky-600">
        <MapIcon className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-deep-navy">Mapa Completo de Cancún</h2>
      <p className="text-gray-600 max-w-md mx-auto">
        Próximamente: Visualiza todas las rutas de transporte público en un solo mapa interactivo con puntos de interés y paradas oficiales.
      </p>
      <div className="pt-4">
        <div className="bg-gray-100 rounded-2xl h-64 flex items-center justify-center border-2 border-dashed border-gray-300">
          <p className="text-gray-400 italic">Cargando visualización geoespacial...</p>
        </div>
      </div>
    </div>
  );
};

export default Mapa;
