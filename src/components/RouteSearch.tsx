import React from 'react';

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
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-caribbean-blue"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        Encuentra tu ruta
      </h2>
      <div className="space-y-3 relative">
        <div className="space-y-4">
          <div>
            <label htmlFor="search-from" className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-caribbean-blue"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
              Desde
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
              type="button"
              aria-label="Intercambiar origen y destino"
              className="pointer-events-auto p-2 bg-white rounded-full shadow-md border border-gray-100 text-caribbean-blue hover:bg-caribbean-blue hover:text-white transition-colors active:scale-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>
            </button>
          </div>

          <div>
            <label htmlFor="search-to" className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-coral"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
              Hasta
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
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
              Calculando...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
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
