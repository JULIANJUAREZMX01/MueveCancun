import React from 'react';
import { Link } from 'react-router-dom';
import { Bus } from 'lucide-react';

/**
 * RutasPage Component
 * Displays the directory of available transport routes.
 */
const RutasPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-deep-navy flex items-center gap-2">
          <Bus className="w-6 h-6 text-caribbean-blue" /> Directorio de Rutas
        </h2>
        <Link to="/" className="text-caribbean-blue hover:underline text-sm">← Volver al buscador</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {['R1', 'R2', 'R6', 'R10', 'R27'].map(route => (
          <div key={route} className="sunny-card p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-600 text-white rounded-full flex items-center justify-center font-bold">
                {route}
              </div>
              <div>
                <div className="font-bold text-deep-navy">Ruta {route}</div>
                <div className="text-xs text-gray-500">Troncal Principal</div>
              </div>
            </div>
            <div className="text-sm font-bold text-caribbean-blue">$13.00</div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-sky-50 border border-sky-100 rounded-xl text-sm text-sky-800 flex items-center gap-2">
        <span className="flex-1 italic">Consulta las frecuencias y horarios oficiales en las terminales.</span>
      </div>
    </div>
  );
};

export default RutasPage;
