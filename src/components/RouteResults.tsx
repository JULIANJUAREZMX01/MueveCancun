import React from 'react';
import { Clock, Banknote, Navigation, Info } from 'lucide-react';

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
      <h3 className="text-lg font-bold text-deep-navy px-2 flex items-center gap-2">
        <Info className="w-5 h-5 text-caribbean-blue" />
        Resultados <span className="text-gray-400 font-normal">/ Results</span>
      </h3>
      {results.map((result, idx) => (
        <div key={idx} className="bg-white p-5 rounded-xl shadow-md border-l-4 border-caribbean-blue hover:shadow-lg transition-shadow duration-300">
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Ruta Recomendada <span className="opacity-70">/ Recommended Route</span>
              </span>
              <h4 className="text-xl font-black text-caribbean-blue">Ruta {result.route_id}</h4>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-2xl font-black text-deep-navy">
                <Banknote className="w-5 h-5 text-jungle-green" />
                ${result.total_cost} <span className="text-xs font-normal text-gray-400">MXN</span>
              </div>
              <div className="flex items-center justify-end gap-1 text-sm text-gray-500 font-medium">
                <Clock className="w-4 h-4" />
                {result.total_time} min <span className="text-[10px] text-gray-400">aprox. / approx.</span>
              </div>
            </div>
          </div>

          <ol className="space-y-3 mt-5 border-t border-gray-50 pt-4" aria-label="Pasos de la ruta / Route steps">
            {result.steps.map((step, sIdx) => (
              <li key={sIdx} className="flex gap-3 items-start group">
                <div className="w-6 h-6 rounded-full bg-caribbean-blue/10 text-caribbean-blue flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 group-hover:bg-caribbean-blue group-hover:text-white transition-colors">
                  {sIdx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 leading-relaxed font-medium">{step.instruction}</p>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tight">
                    <Navigation className="w-3 h-3" />
                    Duración <span className="lowercase font-normal">/ Duration</span>: {step.duration} min
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
});

export default RouteResults;
