import React from 'react';
import { Heart } from 'lucide-react';

const Contribuir: React.FC = () => {
  return (
    <div className="sunny-card p-8 text-center space-y-4">
      <div className="bg-sun-yellow/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-sun-yellow">
        <Heart className="w-8 h-8 fill-current" />
      </div>
      <h2 className="text-2xl font-bold text-deep-navy">Contribuir a CancúnMueve</h2>
      <p className="text-gray-600 max-w-md mx-auto">
        CancúnMueve es un proyecto comunitario. Tu ayuda es vital para mantener la información actualizada.
      </p>
      <div className="space-y-3 pt-4">
        <button className="premium-button w-full max-w-xs mx-auto">
          Reportar Cambio de Ruta
        </button>
        <button className="bg-white border-2 border-sky-600 text-sky-600 px-6 py-3 rounded-2xl font-bold w-full max-w-xs mx-auto">
          Sugerir Nueva Parada
        </button>
      </div>
    </div>
  );
};

export default Contribuir;
