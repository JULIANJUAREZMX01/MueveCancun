import React from 'react';
import { MapPin, Search } from 'lucide-react';

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
    <div className="space-y-6">
      <h2 className="text-2xl high-contrast-text flex items-center gap-2">
        <Search size={24} className="text-caribbean-blue" />
        Encuentra tu ruta
      </h2>

      <div className="space-y-4">
        <div className="relative">
          <label className="block text-xs font-black uppercase tracking-widest text-deep-navy/60 mb-2 ml-1">
            Desde
          </label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-caribbean-blue" size={18} />
            <input
              type="text"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
              placeholder="Ej: Av. Tulum y Cobá"
              className="w-full pl-12 pr-4 py-4 bg-sand/50 border-2 border-transparent focus:border-sun-yellow rounded-2xl outline-none transition-all font-bold text-deep-navy placeholder:text-deep-navy/30"
            />
          </div>
        </div>

        <div className="relative">
          <label className="block text-xs font-black uppercase tracking-widest text-deep-navy/60 mb-2 ml-1">
            Hasta
          </label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-coral" size={18} />
            <input
              type="text"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
              placeholder="Ej: Coco Bongo"
              className="w-full pl-12 pr-4 py-4 bg-sand/50 border-2 border-transparent focus:border-sun-yellow rounded-2xl outline-none transition-all font-bold text-deep-navy placeholder:text-deep-navy/30"
            />
          </div>
        </div>

        <button
          onClick={onSearch}
          disabled={loading || !from || !to}
          className="premium-button w-full mt-4 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2 animate-pulse">
              Calculando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Search size={20} />
              Buscar Ruta
            </span>
          )}
        </button>
      </div>

      <div className="p-4 bg-sun-yellow/10 rounded-2xl border border-sun-yellow/20">
        <p className="text-[10px] font-black uppercase tracking-wider text-deep-navy/60 leading-relaxed">
          💡 Tip: Usa tu ubicación actual o busca por destinos conocidos como ADO, Plaza Las Américas o Coco Bongo.
        </p>
      </div>
    </div>
  );
};

export default RouteSearch;
