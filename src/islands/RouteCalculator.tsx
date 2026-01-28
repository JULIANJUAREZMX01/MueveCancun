import { useState, useEffect } from 'react';

interface RouteCalculatorProps {
  wasmPath?: string;
}

export default function RouteCalculator({
  wasmPath = '/wasm/route-calculator/route_calculator.js'
}: RouteCalculatorProps) {
  const [wasmModule, setWasmModule] = useState<any>(null);
  const [wasmError, setWasmError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Load WASM module
  useEffect(() => {
    async function loadWasm() {
      try {
        setLoading(true);
        setWasmError(false);
        // Dynamic import using the prop path
        const wasm = await import(/* @vite-ignore */ wasmPath);
        await wasm.default(); // Initialize WASM
        setWasmModule(wasm);
        console.log('✅ WASM module loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load WASM:', error);
        setWasmError(true);
      } finally {
        setLoading(false);
      }
    }
    loadWasm();
  }, [wasmPath]);

  const handleSearch = async () => {
    if (!wasmModule || !from || !to) return;

    setCalculating(true);
    setSearchError(null);
    try {
      // Fetch master data for WASM
      const response = await fetch('/data/master_routes.json');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const routesData = await response.json();

      // Call WASM function with new signature (from, to, data)
      const result = wasmModule.calculate_route(from, to, routesData);
      if (result) {
        setResults(Array.isArray(result) ? result : [result]);
      } else {
        setSearchError('No se encontró una ruta válida.');
        setResults([]);
      }
    } catch (error: any) {
      console.error('Route calculation error:', error);
      setSearchError(error.message || 'Error al calcular la ruta.');
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4" role="status" aria-label="Cargando motor de rutas">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
        <p className="text-gray-500">Iniciando motor...</p>
      </div>
    );
  }

  if (wasmError) {
    return (
      <div className="sunny-card p-6 border-red-200 bg-red-50">
        <h2 className="text-xl font-bold text-red-700 mb-2">🚨 Error de Sistema</h2>
        <p className="text-red-600">No se pudo cargar el motor de ruteo. Por favor, recarga la página.</p>
      </div>
    );
  }

  return (
    <div className="sunny-card p-6 animate-fade-in">
      <h2 className="text-2xl font-display font-bold text-deep-navy mb-6 high-contrast-text">
        🔍 Encuentra tu Ruta
      </h2>

      <div className="space-y-4">
        {/* From input */}
        <div>
          <label htmlFor="from-input" className="block text-sm font-medium text-gray-700 mb-2">
            📍 Desde
          </label>
          <input
            id="from-input"
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="Ej: Av. Tulum y Cobá"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          />
        </div>

        {/* To input */}
        <div>
          <label htmlFor="to-input" className="block text-sm font-medium text-gray-700 mb-2">
            📍 Hasta
          </label>
          <input
            id="to-input"
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Ej: Zona Hotelera"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Search button */}
        <button
          onClick={handleSearch}
          disabled={calculating || !from || !to}
          className="w-full premium-button disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
        >
          {calculating ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Calculando...
            </span>
          ) : (
            <>
              <span>🚌</span>
              <span>Buscar Ruta</span>
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {searchError && (
        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg animate-fade-in">
          <p className="text-orange-700 text-sm flex items-center">
            <span className="mr-2">⚠️</span> {searchError}
          </p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-6 space-y-4 animate-slide-up">
          <h3 className="text-lg font-bold text-gray-900">Resultados:</h3>
          {results.map((route, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-primary-500">Ruta {route.route_id}</span>
                <span className="text-sm text-gray-500">{route.total_time_minutes} min</span>
              </div>
              <p className="text-sm text-gray-600">{route.steps?.[0]?.instruction || 'Instrucciones disponibles'}</p>
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <span className="mr-4">💰 ${route.total_cost_mxn} MXN</span>
                <span>🔄 {route.transfers} transbordo(s)</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
