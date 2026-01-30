import { useState, useEffect } from 'react';
import { openDB } from 'idb';

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
  airport_warning?: BilingualString;
  estimated_cost_mxn: number;
}

interface CostResponse {
  cost_mxn: number;
  base_price: number;
  currency: string;
  payment_method: string;
  info: BilingualString;
  seats: number;
}

const MOCK_GEO: Record<string, { lat: number; lng: number }> = {
  'Crucero': { lat: 21.1619, lng: -86.8515 },
  'El Crucero': { lat: 21.1619, lng: -86.8515 },
  'ADO Centro': { lat: 21.1605, lng: -86.8260 },
  'ADO Cancún Hub': { lat: 21.1605, lng: -86.8260 },
  'Coco Bongo': { lat: 21.1385, lng: -86.7474 },
  'Walmart': { lat: 21.1595, lng: -86.8365 },
  'Aeropuerto T2': { lat: 21.0412, lng: -86.8725 },
  'Plaza Las Américas': { lat: 21.1472, lng: -86.8234 },
  'Puerto Juárez': { lat: 21.1850, lng: -86.8030 },
  'Playa del Carmen': { lat: 20.6296, lng: -87.0739 },
  'OXXO Villas Otoch Paraíso': { lat: 21.1685, lng: -86.8850 }
};

export default function RouteCalculator() {
  const [wasmModule, setWasmModule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [hasSufficientBalance, setHasSufficientBalance] = useState(false);

  const [from, setFrom] = useState('Walmart');
  const [to, setTo] = useState('Aeropuerto T2');
  const [seats, setSeats] = useState(1);
  const [isTourist, setIsTourist] = useState(false);

  const [result, setResult] = useState<RouteResponse | null>(null);
  const [cost, setCost] = useState<CostResponse | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [lang, setLang] = useState<'es' | 'en'>('es');
  // const [wallet, setWallet] = useState<any>(null); // Removed as per pivot

  // Load WASM and check Balance
  useEffect(() => {
    async function init() {
      try {
        // Use dynamic import relative to src to satisfy Vite
        const wasm = await import('../wasm/route-calculator/route_calculator.js');
        await wasm.default();
        setWasmModule(wasm);

        const db = await openDB('cancunmueve-db', 2, {
          upgrade(db) {
            if (!db.objectStoreNames.contains('wallet-status')) {
              db.createObjectStore('wallet-status');
            }
          },
        });

        let currentBalance = await db.get('wallet-status', 'driver_current');

        // Auto-init for Pilot testing if not found or empty
        if (currentBalance === undefined || currentBalance === 0) {
          currentBalance = 180.0;
          await db.put('wallet-status', currentBalance, 'driver_current');
        }

        setBalance(currentBalance);
        setHasSufficientBalance(currentBalance >= 180.0);

        setLoading(false);
      } catch (error) {
        console.error('❌ Initialization error:', error);
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleSearch = async () => {
    if (!wasmModule || !from || !to || !hasSufficientBalance) return;

    const fromCoords = MOCK_GEO[from] || { lat: 21.1619, lng: -86.8515 };
    const toCoords = MOCK_GEO[to] || { lat: 21.0412, lng: -86.8725 };

    setCalculating(true);

    try {
      const response = await fetch('/data/master_routes.json');
      const routesData = await response.json();

      const res = wasmModule.calculate_route(
        fromCoords.lat,
        fromCoords.lng,
        toCoords.lat,
        toCoords.lng,
        routesData
      );
      setResult(res);
      console.log('Route calculated:', res);

      if (res.success) {
        const costRes = wasmModule.calculate_trip_cost(res.distance_km, seats, isTourist);
        setCost(costRes);
      } else {
        setCost(null);
      }
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="sunny-card p-6 animate-fade-in shadow-xl border-2 border-primary-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-display font-black text-deep-navy uppercase tracking-tighter">
          {lang === 'es' ? '🧭 Brújula Urbana' : '🧭 Urban Compass'}
        </h2>
        <div className="flex items-center gap-3">
           <div className={`text-[10px] font-black px-2 py-1 rounded shadow-inner ${hasSufficientBalance ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
             {lang === 'es' ? 'PILOTO:' : 'PILOT:'} {balance.toFixed(0)} MXN
           </div>
          <button
            onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
            className="text-xs bg-gray-200 px-2 py-1 rounded font-black hover:bg-gray-300 transition-colors"
          >
            {lang === 'es' ? 'EN' : 'ES'}
          </button>
        </div>
      </div>

      {!hasSufficientBalance && (
        <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-800 text-xs font-black uppercase tracking-tight">
          ⚠️ {lang === 'es'
            ? 'Saldo insuficiente para activar Brújula Urbana ($180 MXN req).'
            : 'Insufficient balance to activate Urban Compass ($180 MXN req).'}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
          
          {/* Swap Button */}
          <button
            onClick={() => {
              const temp = from;
              setFrom(to);
              setTo(temp);
            }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white border border-gray-300 rounded-full p-2 shadow-sm hover:bg-gray-50 hover:scale-110 transition-all group hidden md:block"
            title={lang === 'es' ? 'Intercambiar' : 'Swap'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500 group-hover:text-primary-600 transition-colors">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </button>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">📍 {lang === 'es' ? 'Origen' : 'Origin'}</label>
            <input
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 border-gray-100 font-bold"
              list="locations"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">🏁 {lang === 'es' ? 'Destino' : 'Destination'}</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 border-gray-100 font-bold"
              list="locations"
            />
          </div>
          <datalist id="locations">
            {Object.keys(MOCK_GEO).map(loc => <option key={loc} value={loc} />)}
          </datalist>
        </div>

        <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-center space-x-2">
            <label className="text-[10px] font-black uppercase text-gray-500">💺 {lang === 'es' ? 'Asientos' : 'Seats'}</label>
            <select value={seats} onChange={(e) => setSeats(Number(e.target.value))} className="border rounded-md px-1 font-black bg-white">
              {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="tourist"
              checked={isTourist}
              onChange={(e) => setIsTourist(e.target.checked)}
              className="w-4 h-4 rounded text-primary-600 border-gray-300"
            />
            <label htmlFor="tourist" className="text-[10px] font-black uppercase text-gray-500 cursor-pointer">🌴 {lang === 'es' ? 'Turista' : 'Tourist'}</label>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={calculating || !hasSufficientBalance}
          className="w-full premium-button py-4 text-xl disabled:opacity-50 disabled:cursor-not-allowed font-black uppercase tracking-tighter shadow-lg"
        >
          {calculating ? '...' : (lang === 'es' ? 'Trazar Ruta' : 'Find Route')}
        </button>
      </div>

      {result && result.success && (
        <div className="mt-6 space-y-4 animate-slide-up bg-white p-5 rounded-2xl border-4 border-primary-500 shadow-2xl">
          <div className="flex justify-between items-start border-b pb-4">
            <div>
              <span className="text-[10px] uppercase font-black text-primary-600 tracking-widest">{lang === 'es' ? 'Conexión Sugerida' : 'Suggested Connection'}</span>
              <div className="text-xl font-black text-deep-navy">{result.routes.join(' ➔ ')}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-primary-600">${cost?.cost_mxn.toFixed(0)}</div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter leading-none">{lang === 'es' ? 'Pago en Efectivo' : 'Cash Only'}</div>
            </div>
          </div>

          {result.airport_warning && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-[11px] font-black flex items-start gap-3 leading-tight shadow-sm">
              <span className="text-2xl">🚨</span>
              <p>{result.airport_warning[lang]}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <h4 className="text-[10px] uppercase font-black text-gray-300 tracking-widest">{lang === 'es' ? 'Instrucciones' : 'Instructions'}</h4>
            {result.instructions.map((inst, idx) => (
              <div key={idx} className="flex gap-4 text-sm font-black text-gray-800 items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-deep-navy text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-md border-2 border-primary-400">{idx + 1}</span>
                <span className="pt-0.5">{inst[lang]}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 mt-2 border-t text-[10px] text-gray-400 font-black italic text-center uppercase tracking-widest">
            {cost?.info[lang]}
          </div>
        </div>
      )}

      {result && !result.success && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl border-2 border-red-100 font-black text-xs flex items-center gap-2 uppercase">
          <span>❌</span>
          <span>{result.error?.[lang]}</span>
        </div>
      )}
    </div>
  );
}
