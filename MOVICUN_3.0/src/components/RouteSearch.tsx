import React from 'react';

interface RouteSearchProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onSearch: () => void;
  loading: boolean;
}

const RouteSearch: React.FC<RouteSearchProps> = ({
  from,
  to,
  onFromChange,
  onToChange,
  onSearch,
  loading,
}) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md space-y-4 border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        🔍 Encuentra tu ruta
      </h2>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            📍 Desde
          </label>
          <input
            type="text"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            placeholder="Ej: Av. Tulum y Cobá"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            📍 Hasta
          </label>
          <input
            type="text"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            placeholder="Ej: Coco Bongo"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        <button
          onClick={onSearch}
          disabled={loading || !from || !to}
          className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm active:scale-[0.98]"
        >
          {loading ? '🔄 Calculando...' : '🔍 Buscar Ruta'}
        </button>
      </div>

      <div className="text-xs text-gray-500 text-center">
        💡 Tip: Usa tu ubicación actual o busca por destino conocido
      </div>
    </div>
  );
};

export default RouteSearch;
