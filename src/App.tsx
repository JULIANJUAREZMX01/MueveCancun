import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import { Map as MapIcon, Route as RouteIcon, Heart, Search } from 'lucide-react';
import init, { find_route } from './wasm/route_calculator/route_calculator';
import { getBalance } from './utils/db';

// Pages
import Home from './pages/Home';
import MapaPage from './pages/Mapa';
import RutasPage from './pages/Rutas';
import ContribuirPage from './pages/Contribuir';

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
  const [balance, setBalance] = useState<number>(0);

  const handleSwap = () => {
    const temp = searchFrom;
    setSearchFrom(searchTo);
    setSearchTo(temp);
  };

  // Initialize WASM and Balance
  useEffect(() => {
    init().then(() => {
      setWasmReady(true);
      console.log('WASM loaded');
    }).catch(console.error);

    getBalance().then(val => {
      setBalance(val);
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
      const result = find_route(searchFrom, searchTo);
      setRouteResults([result as RouteResult]);
    } catch (error) {
      console.error('Error calculando ruta:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-sky-600 text-white p-4 shadow-lg sticky top-0 z-50">
          <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <Link to="/" className="text-2xl font-bold flex items-center gap-2 hover:text-sky-100 transition-colors">
                🚌 CancúnMueve
              </Link>
              <p className="text-sky-100 text-sm hidden md:block">Tu guía de transporte público</p>
            </div>

            <nav className="flex gap-1 bg-sky-700/50 p-1 rounded-xl">
              <NavLink to="/" className={({isActive}) => `flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-white text-sky-600 shadow-sm' : 'text-sky-100 hover:bg-sky-600'}`}>
                <Search className="w-4 h-4" /> Buscar
              </NavLink>
              <NavLink to="/mapa" className={({isActive}) => `flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-white text-sky-600 shadow-sm' : 'text-sky-100 hover:bg-sky-600'}`}>
                <MapIcon className="w-4 h-4" /> Mapa
              </NavLink>
              <NavLink to="/rutas" className={({isActive}) => `flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-white text-sky-600 shadow-sm' : 'text-sky-100 hover:bg-sky-600'}`}>
                <RouteIcon className="w-4 h-4" /> Rutas
              </NavLink>
              <NavLink to="/contribuir" className={({isActive}) => `flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-white text-sky-600 shadow-sm' : 'text-sky-100 hover:bg-sky-600'}`}>
                <Heart className="w-4 h-4" /> Feedback
              </NavLink>
            </nav>
          </div>
        </header>

        <main className="container mx-auto p-4 flex-1">
          <Routes>
            <Route path="/" element={
              <Home
                searchFrom={searchFrom}
                searchTo={searchTo}
                setSearchFrom={setSearchFrom}
                setSearchTo={setSearchTo}
                handleSearch={handleSearch}
                handleSwap={handleSwap}
                loading={loading}
                routeResults={routeResults}
                balance={balance}
                userLocation={userLocation}
              />
            } />
            <Route path="/mapa" element={<MapaPage />} />
            <Route path="/rutas" element={<RutasPage />} />
            <Route path="/contribuir" element={<ContribuirPage />} />
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                <h2 className="text-6xl font-bold text-sky-200">404</h2>
                <p className="text-xl text-gray-600 font-medium">¡Vaya! Esta ruta no existe en nuestro mapa.</p>
                <Link to="/" className="premium-button inline-flex items-center gap-2">
                  <Search className="w-5 h-5" /> Volver al Inicio
                </Link>
              </div>
            } />
          </Routes>
        </main>

        <footer className="bg-white border-t p-6 text-center text-gray-500 text-xs mt-auto">
          <div className="container mx-auto space-y-2">
            <p>&copy; 2025 CancúnMueve - Información de la comunidad para la comunidad.</p>
            <div className="flex justify-center gap-4 text-sky-600 font-medium">
              <Link to="/mapa" className="hover:underline">Mapa</Link>
              <Link to="/rutas" className="hover:underline">Rutas</Link>
              <Link to="/contribuir" className="hover:underline">Feedback</Link>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
