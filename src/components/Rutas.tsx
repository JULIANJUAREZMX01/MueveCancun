import React from 'react';
import { Route } from 'lucide-react';

const Rutas: React.FC = () => {
  return (
    <div className="sunny-card p-8 text-center space-y-4">
      <div className="bg-coral/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-coral">
        <Route className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-deep-navy">Directorio de Rutas</h2>
      <p className="text-gray-600 max-w-md mx-auto">
        Explora el catálogo completo de rutas urbanas, de la Zona Hotelera y foráneas.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-left">
        {['R1', 'R2', 'R10', 'R27'].map((ruta) => (
          <div key={ruta} className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors flex justify-between items-center">
            <span className="font-bold text-lg text-sky-600">{ruta}</span>
            <span className="text-sm text-gray-500">Ver detalles &rarr;</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Rutas;
