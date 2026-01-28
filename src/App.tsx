import React from 'react';
import Map from './components/Map';
import RouteSearch from './components/RouteSearch';
import RouteResults from './components/RouteResults';
import ContributeForm from './components/ContributeForm';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-sky-600">CancúnMueve</h1>
        <p className="text-gray-600">Transporte Público en un solo lugar</p>
      </header>

      <main className="max-w-md mx-auto space-y-6">
        <RouteSearch />
        <Map />
        <RouteResults />
        <ContributeForm />
      </main>
    </div>
  );
}

export default App;
