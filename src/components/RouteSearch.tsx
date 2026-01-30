import React from 'react';
import { MapPin, Search, ArrowUpDown, Loader2 } from 'lucide-react';

interface RouteSearchProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onSearch: () => void;
  onSwap: () => void;
  loading: boolean;
}

const RouteSearch: React.FC<RouteSearchProps> = ({
  from,
  to,
  onFromChange,
  onToChange,
  onSearch,
  onSwap,
  loading,
}) => {
  return (
    <div className="sunny-card p-6 space-y-4">
      <h2 className="text-xl font-bold text-deep-navy flex items-center gap-2">
        <Search className="w-5 h-5 text-caribbean-blue" /> Encuentra tu ruta
      </h2>
      <div className="space-y-3 relative">
        <div className="space-y-4">
          <div>
            <label htmlFor="search-from" className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
              <MapPin className="w-4 h-4 text-caribbean-blue" /> Desde
            </label>
            <input
              id="search-from"
              type="text"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
              placeholder="Ej: Av. Tulum y Cobá"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caribbean-blue focus:border-transparent outline-none transition-all bg-white/50"
            />
          </div>

          {/* Swap Button */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
             <button
              onClick={onSwap}
              aria-label="Intercambiar origen y destino"
              className="pointer-events-auto p-2 bg-white rounded-full shadow-md border border-gray-100 text-caribbean-blue hover:bg-caribbean-blue hover:text-white transition-colors active:scale-90"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label htmlFor="search-to" className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
              <MapPin className="w-4 h-4 text-coral" /> Hasta
            </label>
            <input
              id="search-to"
              type="text"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
              placeholder="Ej: Coco Bongo"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caribbean-blue focus:border-transparent outline-none transition-all bg-white/50"
            />
          </div>
        </div>

        <button
          onClick={onSearch}
          disabled={loading || !from || !to}
          className="premium-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Calculando...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Buscar Ruta
            </>
          )}
        </button>
      </div>

      <div className="text-xs text-gray-500 text-center italic">
        💡 Tip: Usa tu ubicación actual o busca por destino conocido
      </div>
    </div>
  );
};

export default RouteSearch;
