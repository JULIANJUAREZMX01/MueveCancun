import React from 'react';

interface RouteResultsProps {
  routes: any[];
}

const RouteResults: React.FC<RouteResultsProps> = ({ routes }) => {
  return (
    <div className="flex flex-col gap-4 p-4">
      {routes.length === 0 ? (
        <p className="text-center text-gray-500">No se encontraron rutas.</p>
      ) : (
        routes.map((route) => (
          <div key={route.id} className="p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold" style={{ color: route.color }}>{route.nombre}</h3>
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-800">
                ${route.tarifa.toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Horario: {route.horario}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Frecuencia: {route.frecuencia_minutos} min</p>
          </div>
        ))
      )}
    </div>
  );
};

export default RouteResults;
