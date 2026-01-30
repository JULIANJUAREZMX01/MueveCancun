import { useState, useEffect } from 'react';
import Map from './components/Map';
import RouteSearch from './components/RouteSearch';
import RouteResults from './components/RouteResults';
import init, { calculate_route } from './wasm/route_calculator/route_calculator';

interface RouteResult {
  route_id: string;
  total_time: number;
  total_cost: number;
  steps: Array<{
    instruction: string;
    route: string;
    duration: number;
  }>;
}

function App() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [routeResults, setRouteResults] = useState<RouteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [wasmReady, setWasmReady] = useState(false);

  const handleSwap = () => {
    const temp = searchFrom;
    setSearchFrom(searchTo);
    setSearchTo(temp);
  };

  // Initialize WASM
  useEffect(() => {
    init().then(() => {
      setWasmReady(true);
      console.log('WASM loaded');
    }).catch(console.error);
  }, []);

  // Obtener ubicación del usuario
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.longitude, position.coords.latitude]);
        },
        (error) => console.error('Error obteniendo ubicación:', error)
      );
    }
  }, []);

  // Calcular ruta con WASM
  const handleSearch = async () => {
    if (!wasmReady) {
      alert('Motor de rutas no está listo aún.');
      return;
    }
    setLoading(true);
    try {
      // AQUÍ se llama al módulo WASM
      const result = calculate_route(searchFrom, searchTo);
      // calculate_route returns a single result in this mock, but we'll wrap it in an array
      setRouteResults([result as RouteResult]);
    } catch (error) {
      console.error('Error calculando ruta:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-sky-600 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          🚌 CancúnMueve
        </h1>
        <p className="text-sky-100 text-sm">Tu guía de transporte público</p>
      </header>

      <main className="container mx-auto p-4 space-y-4 flex-1 flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/3 space-y-4">
          <RouteSearch
            from={searchFrom}
            to={searchTo}
            onFromChange={setSearchFrom}
            onToChange={setSearchTo}
            onSearch={handleSearch}
            onSwap={handleSwap}
            loading={loading}
          />

          {routeResults.length > 0 && (
            <RouteResults results={routeResults} />
          )}
        </div>

        <div className="w-full md:w-2/3 h-[50vh] md:h-auto rounded-xl overflow-hidden shadow-inner border border-gray-200">
          <Map
            center={userLocation || [-86.8515, 21.1619]}
            userLocation={userLocation}
          />
        </div>
      </main>

      <footer className="bg-white border-t p-4 text-center text-gray-500 text-xs mt-auto">
        &copy; 2025 CancúnMueve - Información de la comunidad
      </footer>
    </div>
  );
}

export default App;
