import { useState, useEffect } from 'react';

interface BilingualString {
  en: string;
  es: string;
}

interface RouteResponse {
  success: boolean;
  path: string[];
  has_transfer: boolean;
  transfer_point?: BilingualString;
  routes: string[];
  distance_km: number;
  time_min: number;
  instructions: BilingualString[];
  error?: BilingualString;
}

interface CostResponse {
  cost_mxn: number;
  base_price: number;
  currency: string;
  gatekeeper_pass: boolean;
  seats: number;
}

interface RouteCalculatorProps {
  wasmPath?: string;
}

// Mock geocoding for example locations
const MOCK_GEO: Record<string, { lat: number; lng: number }> = {
  'Crucero': { lat: 21.1619, lng: -86.8515 },
  'Parque La Rehoyada': { lat: 21.1619, lng: -86.8515 },
  'Coco Bongo': { lat: 21.1385, lng: -86.7474 },
  'Walmart': { lat: 21.1595, lng: -86.8365 },
  'Walmart Cobá': { lat: 21.1595, lng: -86.8365 },
  'Aeropuerto': { lat: 21.0412, lng: -86.8725 },
  'Aeropuerto T3': { lat: 21.0412, lng: -86.8725 },
  'Plaza Las Américas': { lat: 21.1472, lng: -86.8234 },
};

export default function RouteCalculator({
  wasmPath = '/wasm/route-calculator/route_calculator.js'
}: RouteCalculatorProps) {
  const [wasmModule, setWasmModule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('Walmart');
  const [to, setTo] = useState('Aeropuerto');
  const [seats, setSeats] = useState(1);
  const [isTourist, setIsTourist] = useState(false);

  const [result, setResult] = useState<RouteResponse | null>(null);
  const [cost, setCost] = useState<CostResponse | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [lang, setLang] = useState<'es' | 'en'>('es');

  // Load WASM module
  useEffect(() => {
    async function loadWasm() {
      try {
        // Correct dynamic loading from src/
        const wasm = await import(/* @vite-ignore */ wasmPath);
        await wasm.default();
        setWasmModule(wasm);
        setLoading(false);
        console.log('✅ WASM module loaded successfully from:', wasmPath);
      } catch (error) {
        console.error('❌ Failed to load WASM from:', wasmPath, error);
        setLoading(false);
      }
    }
    loadWasm();
  }, [wasmPath]);

  const handleSearch = async () => {
    if (!wasmModule || !from || !to) return;

    const fromCoords = MOCK_GEO[from] || { lat: 21.1619, lng: -86.8515 };
    const toCoords = MOCK_GEO[to] || { lat: 21.0412, lng: -86.8725 };

    setCalculating(true);
    try {
      const response = await fetch('/data/master_routes.json');
      const routesData = await response.json();

      // 1. Calculate Route (Dijkstra)
      const res = wasmModule.calculate_route(
        fromCoords.lat,
        fromCoords.lng,
        toCoords.lat,
        toCoords.lng,
        routesData
      );
      setResult(res);

      // 2. Calculate Cost (Financial Logic)
      if (res.success) {
        const costRes = wasmModule.calculate_trip_cost(res.distance_km, seats, isTourist);
        setCost(costRes);
      } else {
        setCost(null);
      }

      console.log('Route & Cost calculated:', { res, cost: costRes });
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" role="status" aria-label="Cargando motor de rutas">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="sunny-card p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-display font-bold text-deep-navy high-contrast-text">
          {lang === 'es' ? '🔍 Encuentra tu Ruta' : '🔍 Find your Route'}
        </h2>
        <button
          onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
          className="text-xs bg-gray-200 px-2 py-1 rounded"
        >
          {lang === 'es' ? 'English' : 'Español'}
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="from" className="block text-sm font-medium text-gray-700 mb-2">
              📍 {lang === 'es' ? 'Desde' : 'From'}
            </label>
            <input
              id="from"
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label htmlFor="to" className="block text-sm font-medium text-gray-700 mb-2">
              📍 {lang === 'es' ? 'Hasta' : 'To'}
            </label>
            <input
              id="to"
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">💺 {lang === 'es' ? 'Asientos' : 'Seats'}</label>
            <select
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
              className="border rounded px-2 py-1"
            >
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="tourist"
              checked={isTourist}
              onChange={(e) => setIsTourist(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <label htmlFor="tourist" className="text-sm font-medium text-gray-700">🌴 {lang === 'es' ? 'Turista' : 'Tourist'}</label>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={calculating}
          className="w-full premium-button disabled:opacity-50"
        >
          {calculating ? (lang === 'es' ? 'Calculando...' : 'Calculating...') : (lang === 'es' ? 'Buscar Ruta' : 'Search Route')}
        </button>
      </div>

      {result && result.success && (
        <div className="mt-6 space-y-4 animate-slide-up bg-blue-50 p-4 rounded-xl border border-blue-100">
          <div className="flex justify-between items-end border-b border-blue-200 pb-3">
            <div>
              <span className="text-xs uppercase tracking-wider text-blue-600 font-bold">{lang === 'es' ? 'Ruta Sugerida' : 'Suggested Route'}</span>
              <div className="text-xl font-bold text-deep-navy">{result.routes.join(' → ')}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-primary-600">${cost?.cost_mxn.toFixed(2)} MXN</div>
              <div className="text-xs text-gray-500">{result.time_min} min | {result.distance_km.toFixed(1)} km</div>
            </div>
          </div>

          {result.has_transfer && (
            <div className="text-sm bg-yellow-100 p-3 rounded-lg border border-yellow-200 text-yellow-800 flex items-start space-x-2">
              <span>⚠️</span>
              <div>
                <strong>{lang === 'es' ? 'Transbordo necesario' : 'Transfer required'}</strong>
                <p>{lang === 'es' ? 'Cambia de ruta en:' : 'Change route at:'} {result.transfer_point?.[lang]}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest">{lang === 'es' ? 'Instrucciones' : 'Instructions'}</h4>
            {result.instructions.map((inst, idx) => (
              <div key={idx} className="flex gap-3 text-sm text-gray-700 items-start">
                <span className="flex-shrink-0 w-5 h-5 bg-white rounded-full border border-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-500">{idx + 1}</span>
                <span>{inst[lang]}</span>
              </div>
            ))}
          </div>

          {cost && !cost.gatekeeper_pass && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-xs italic">
              * {lang === 'es' ? 'Saldo insuficiente en DriverWallet. Verifica tu cuenta.' : 'Insufficient balance in DriverWallet. Check your account.'}
            </div>
          )}
        </div>
      )}

      {result && !result.success && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center space-x-2">
          <span>❌</span>
          <span>{result.error?.[lang]}</span>
        </div>
      )}
    </div>
  );
}
