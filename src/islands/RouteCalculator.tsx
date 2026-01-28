import { useState, useEffect } from 'react';
import { getWalletBalance } from '../utils/db';

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
  
  const [result, setResult] = useState<RouteResponse | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const [wallet, setWallet] = useState<any>(null);
  
  // Load WASM module
  useEffect(() => {
    async function loadWasm() {
      try {
        let wasm;
        if (wasmPath === '/wasm/route-calculator/route_calculator.js') {
             wasm = await import('../wasm/route-calculator/route_calculator.js');
        } else {
             wasm = await import(/* @vite-ignore */ wasmPath);
        }
        await wasm.default();
        setWasmModule(wasm);
        setLoading(false);
        console.log('✅ WASM module loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load WASM:', error);
        setLoading(false);
      }
    }
    loadWasm();
  }, [wasmPath]);

  // Load Wallet from IDB (Still needed for Gatekeeper check, but hidden from UI)
  useEffect(() => {
    async function loadWallet() {
      try {
        const w = await getWalletBalance();
        if (w) {
            setWallet(w);
            console.log('💰 Wallet loaded (Driver Check):', w);
        }
      } catch (err) {
        console.error('Failed to load wallet', err);
      }
    }
    loadWallet();
  }, []);

  const handleSearch = async () => {
    if (!wasmModule || !from || !to) return; 

    // Gatekeeper check remains, but UI feedback for cost is removed
    const currentWallet = wallet || { balance_mxn: 0 }; 

    const fromCoords = MOCK_GEO[from] || { lat: 21.1619, lng: -86.8515 };
    const toCoords = MOCK_GEO[to] || { lat: 21.0412, lng: -86.8725 };

    setCalculating(true);
    try {
      const response = await fetch('/data/master_routes.json');
      const routesData = await response.json();

      // 1. Calculate Route (with Wallet Check)
      const res = wasmModule.calculate_route(
        fromCoords.lat,
        fromCoords.lng,
        toCoords.lat,
        toCoords.lng,
        routesData,
        currentWallet
      );
      setResult(res);
      console.log('Route calculated:', res);

      // Financial Cost Logic - DISABLED for Passengers
    } catch (error) {
      console.error('Route calculation error:', error);
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📍 {lang === 'es' ? 'Desde' : 'From'}
          </label>
          <input
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📍 {lang === 'es' ? 'Hasta' : 'To'}
          </label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
          />
        </div>

        {/* Financial Controls REMOVED - Passenger View Only */}

        <button
          onClick={handleSearch}
          disabled={calculating}
          className="w-full premium-button disabled:opacity-50 transition-all transform hover:scale-105"
        >
          {calculating ? (lang === 'es' ? 'Calculando...' : 'Calculating...') : (lang === 'es' ? 'Buscar Ruta' : 'Search Route')}
        </button>
      </div>

      {result && result.success && (
        <div className="mt-6 space-y-4 animate-slide-up bg-blue-50 p-4 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="font-bold text-deep-navy">
              {result.routes.join(' → ')}
            </span>
            <span className="text-sm font-bold text-primary-600">
              {result.time_min} min | {result.distance_km.toFixed(1)} km
            </span>
          </div>

          {result.has_transfer && (
            <div className="text-sm bg-yellow-100 p-2 rounded border border-yellow-200 text-yellow-800">
              ⚠️ {lang === 'es' ? 'Transbordo en:' : 'Transfer at:'} <strong>{result.transfer_point?.[lang]}</strong>
            </div>
          )}
          
          <div className="space-y-2">
            {result.instructions.map((inst, idx) => (
              <div key={idx} className="flex gap-3 text-sm text-gray-700">
                <span className="text-primary-500">•</span>
                <span>{inst[lang]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && !result.success && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
          ❌ {result.error?.[lang]}
        </div>
      )}
    </div>
  );
}
