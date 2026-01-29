import React from 'react';

interface RouteStep {
  instruction: string;
  route: string;
  duration: number;
}

interface RouteResult {
  route_id: string;
  total_time: number;
  total_cost: number;
  steps: RouteStep[];
}

interface RouteResultsProps {
  results: RouteResult[];
}

const RouteResults: React.FC<RouteResultsProps> = React.memo(({ results }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-700 px-2">Resultados</h3>
      {results.map((result, idx) => (
        <div key={idx} className="bg-white p-5 rounded-xl shadow-md border-l-4 border-sky-500">
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Ruta Recomendada</span>
              <h4 className="text-xl font-bold text-sky-600">Ruta {result.route_id}</h4>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-gray-800">${result.total_cost} <span className="text-xs font-normal">MXN</span></div>
              <div className="text-sm text-gray-500">{result.total_time} min aprox.</div>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {result.steps.map((step, sIdx) => (
              <div key={sIdx} className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {sIdx + 1}
                </div>
                <div>
                  <p className="text-sm text-gray-700">{step.instruction}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Duración: {step.duration} min</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

export default RouteResults;
