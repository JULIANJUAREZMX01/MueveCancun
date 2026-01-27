import { useState, useEffect } from 'react';
import Map from './components/Map';
import RouteSearch from './components/RouteSearch';
import RouteResults from './components/RouteResults';
import init, { calculate_route } from './wasm/route_calculator';
import { Bus } from 'lucide-react';

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
  const [routesData, setRoutesData] = useState<any>(null);

  // Initialize WASM
  useEffect(() => {
    init().then(() => {
      setWasmReady(true);
      console.log('WASM loaded');
    }).catch(console.error);

    // Fetch routes data for WASM processing
    fetch('/data/routes.json')
      .then(res => res.json())
      .then(data => setRoutesData(data))
      .catch(console.error);
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
    if (!wasmReady || !routesData) {
      alert('Motor de rutas no está listo aún.');
      return;
    }
    setLoading(true);
    try {
      // Pasamos los datos de las rutas al módulo WASM para procesamiento local
      const result = calculate_route(searchFrom, searchTo, routesData);
      setRouteResults([result as RouteResult]);
    } catch (error) {
      console.error('Error calculando ruta:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col safe-area-bottom">
      <header className="p-6 bg-transparent">
        <div className="flex items-center gap-3">
          <div className="bg-sun-yellow p-3 rounded-2xl shadow-lg">
            <Bus className="text-deep-navy" size={32} />
          </div>
          <div>
            <h1 className="text-3xl high-contrast-text uppercase">CancúnMueve</h1>
            <p className="text-caribbean-blue font-bold text-sm tracking-widest uppercase">Tu guía de transporte público</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6 flex-1 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-1/3 space-y-6">
          <div className="sunny-card p-6">
            <RouteSearch
              from={searchFrom}
              to={searchTo}
              onFromChange={setSearchFrom}
              onToChange={setSearchTo}
              onSearch={handleSearch}
              loading={loading}
            />
          </div>

          {routeResults.length > 0 && (
            <div className="sunny-card p-6 overflow-y-auto max-h-[60vh]">
              <RouteResults results={routeResults} />
            </div>
          )}
        </div>

        <div className="w-full lg:w-2/3 h-[60vh] lg:h-auto sunny-card overflow-hidden relative min-h-[500px]">
          <Map
            center={userLocation || [-86.8515, 21.1619]}
            userLocation={userLocation}
          />
        </div>
      </main>

      <footer className="p-8 text-center text-deep-navy/40 text-xs font-bold uppercase tracking-widest">
        &copy; 2025 CancúnMueve - Información de la comunidad para la comunidad
      </footer>
    </div>
  );
}

export default App;
