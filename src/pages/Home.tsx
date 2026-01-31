import React from 'react';
import RouteSearch from '../components/RouteSearch';
import RouteResults from '../components/RouteResults';
import Map from '../components/Map';

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

interface HomeProps {
  searchFrom: string;
  searchTo: string;
  setSearchFrom: (val: string) => void;
  setSearchTo: (val: string) => void;
  handleSearch: () => void;
  handleSwap: () => void;
  loading: boolean;
  routeResults: RouteResult[];
  balance: number;
  userLocation: [number, number] | null;
}

const Home: React.FC<HomeProps> = ({
  searchFrom,
  searchTo,
  setSearchFrom,
  setSearchTo,
  handleSearch,
  handleSwap,
  loading,
  routeResults,
  balance,
  userLocation,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 h-full">
      <div className="w-full md:w-1/3 space-y-4 overflow-y-auto pr-2">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-sky-100 flex justify-between items-center">
          <span className="text-gray-600 font-medium">Mi Billetera</span>
          <span className={`text-lg font-bold ${balance < 180 ? 'text-red-600' : 'text-green-600'}`}>
            ${balance.toFixed(2)} MXN
          </span>
        </div>

        <RouteSearch
          from={searchFrom}
          to={searchTo}
          onFromChange={setSearchFrom}
          onToChange={setSearchTo}
          onSearch={handleSearch}
          onSwap={handleSwap}
          loading={loading}
          balance={balance}
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
    </div>
  );
};

export default Home;
