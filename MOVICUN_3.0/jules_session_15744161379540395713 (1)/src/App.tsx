import { useState, useEffect } from 'react';
import Map from './components/Map';
import RouteSearch from './components/RouteSearch';
import RouteResults from './components/RouteResults';
import ContributeForm from './components/ContributeForm';
import { saveRoutes, getRoutes } from './utils/db';
import init, { calculate_route } from './wasm/route_calculator/route_calculator';

function App() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<any[]>([]);
  const [wasmReady, setWasmReady] = useState(false);

  useEffect(() => {
    // Load WASM
    init().then(() => {
      setWasmReady(true);
      console.log('WASM loaded');
      // Example call
      const res = calculate_route(21.1619, -86.8515, 21.1385, -86.7474);
      console.log(res);
    }).catch(console.error);

    // Fetch routes
    const loadRoutes = async () => {
      try {
        const cached = await getRoutes();
        if (cached) {
          setRoutes(cached.rutas);
          setFilteredRoutes(cached.rutas);
        }

        const response = await fetch('/data/routes.json');
        const data = await response.json();
        setRoutes(data.rutas);
        setFilteredRoutes(data.rutas);
        await saveRoutes(data);
      } catch (error) {
        console.error('Error loading routes:', error);
      }
    };

    loadRoutes();
  }, []);

  const handleSearch = (query: string) => {
    if (!query) {
      setFilteredRoutes(routes);
      return;
    }
    const filtered = routes.filter((route) =>
      route.nombre.toLowerCase().includes(query.toLowerCase()) ||
      route.paradas.some((p: any) => p.nombre.toLowerCase().includes(query.toLowerCase()))
    );
    setFilteredRoutes(filtered);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="bg-blue-600 p-4 text-white text-center shadow-md">
        <h1 className="text-2xl font-bold uppercase tracking-wider">CancúnMueve</h1>
        <p className="text-xs">Tu guía de transporte público</p>
      </header>

      <main className="flex-1 flex flex-col md:flex-row">
        <div className="w-full md:w-1/3 p-4 overflow-y-auto max-h-[50vh] md:max-h-full border-r border-gray-200 dark:border-gray-700">
          <RouteSearch onSearch={handleSearch} />
          <RouteResults routes={filteredRoutes} />
          <ContributeForm />
        </div>
        
        <div className="w-full md:w-2/3 h-[50vh] md:h-auto">
          <Map routes={filteredRoutes} />
        </div>
      </main>

      <footer className="p-4 bg-gray-200 dark:bg-gray-800 text-center text-sm">
        <p>&copy; 2025 CancúnMueve - Información de la comunidad para la comunidad</p>
        {!wasmReady && <p className="text-orange-500 text-xs">Cargando motor de rutas...</p>}
      </footer>
    </div>
  );
}

export default App;
