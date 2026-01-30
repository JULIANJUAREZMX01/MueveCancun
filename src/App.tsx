import { useState, useEffect } from 'react';
import { Wallet, Map as MapIcon, Route, Info } from 'lucide-react';
import { Routes, Route as ReactRoute, Link, useLocation } from 'react-router-dom';
import Map from './components/Map';
import RouteSearch from './components/RouteSearch';
import RouteResults from './components/RouteResults';
import Mapa from './components/Mapa';
import Rutas from './components/Rutas';
import Contribuir from './components/Contribuir';
import init, { calculate_route } from './wasm/route_calculator/route_calculator';
import { getBalance, ensureInitialBalance } from './utils/db';

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
  const [balance, setBalance] = useState<number | null>(null);

  const handleSwap = () => {
    const temp = searchFrom;
    setSearchFrom(searchTo);
    setSearchTo(temp);
  };

  // Initialize WASM and Wallet
  useEffect(() => {
    const setup = async () => {
      try {
        await init();
        setWasmReady(true);
        console.log('WASM loaded');

        await ensureInitialBalance();
        const currentBalance = await getBalance();
        setBalance(currentBalance);
      } catch (error) {
        console.error('Setup error:', error);
      }
    };
    setup();
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

    // Gatekeeper check: 180 MXN required
    if (balance !== null && balance < 180) {
      alert('Saldo insuficiente. Se requiere un mínimo de $180.00 MXN para usar el buscador.');
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

  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-sky-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Link to="/">🚌 CancúnMueve</Link>
            </h1>
            <p className="text-sky-100 text-sm">Tu guía de transporte público</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2 flex items-center gap-3 border border-white/30">
            <Wallet className="w-5 h-5 text-sun-yellow" />
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-sky-100 leading-none">Saldo Driver</p>
              <p className="text-lg font-black leading-none">
                ${balance !== null ? balance.toFixed(2) : "---.--"} MXN
              </p>
            </div>
          </div>
        </div>

        <nav className="container mx-auto flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          <Link
            to="/"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors whitespace-nowrap ${location.pathname === '/' ? 'bg-white text-sky-600 font-bold' : 'hover:bg-white/10 text-white'}`}
          >
            <Route className="w-4 h-4" /> Buscador
          </Link>
          <Link
            to="/mapa"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors whitespace-nowrap ${location.pathname === '/mapa' ? 'bg-white text-sky-600 font-bold' : 'hover:bg-white/10 text-white'}`}
          >
            <MapIcon className="w-4 h-4" /> Mapa Completo
          </Link>
          <Link
            to="/rutas"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors whitespace-nowrap ${location.pathname === '/rutas' ? 'bg-white text-sky-600 font-bold' : 'hover:bg-white/10 text-white'}`}
          >
            <Route className="w-4 h-4" /> Todas las Rutas
          </Link>
          <Link
            to="/contribuir"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors whitespace-nowrap ${location.pathname === '/contribuir' ? 'bg-white text-sky-600 font-bold' : 'hover:bg-white/10 text-white'}`}
          >
            <Info className="w-4 h-4" /> Contribuir
          </Link>
        </nav>
      </header>

      <main className="container mx-auto p-4 flex-1">
        <Routes>
          <ReactRoute path="/" element={
            <div className="space-y-4 flex flex-col md:flex-row gap-4 h-full">
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

              <div className="w-full md:w-2/3 h-[50vh] md:h-auto min-h-[400px] rounded-xl overflow-hidden shadow-inner border border-gray-200">
                <Map
                  center={userLocation || [-86.8515, 21.1619]}
                  userLocation={userLocation}
                />
              </div>
            </div>
          } />
          <ReactRoute path="/mapa" element={<Mapa />} />
          <ReactRoute path="/rutas" element={<Rutas />} />
          <ReactRoute path="/contribuir" element={<Contribuir />} />
        </Routes>
      </main>

      <footer className="bg-white border-t p-4 text-center text-gray-500 text-xs mt-auto">
        &copy; 2025 CancúnMueve - Información de la comunidad
      </footer>
    </div>
  );
}

export default App;
