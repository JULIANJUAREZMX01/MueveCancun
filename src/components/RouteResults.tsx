import React from 'react';
import { Clock, DollarSign, Navigation } from 'lucide-react';

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

const RouteResults: React.FC<RouteResultsProps> = ({ results }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl high-contrast-text px-2 flex items-center gap-2">
        <Navigation size={20} className="text-jungle-green" />
        Resultados
      </h3>

      {results.map((result, idx) => (
        <div key={idx} className="bg-sand/30 p-5 rounded-2xl border border-deep-navy/5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-deep-navy/40">Ruta Recomendada</span>
              <h4 className="text-2xl high-contrast-text text-caribbean-blue">Ruta {result.route_id}</h4>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end text-xl font-black text-deep-navy">
                <DollarSign size={16} />
                {result.total_cost}
              </div>
              <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-deep-navy/40 uppercase tracking-wider">
                <Clock size={10} />
                {result.total_time} min
              </div>
            </div>
          </div>

          <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-deep-navy/5">
            {result.steps.map((step, sIdx) => (
              <div key={sIdx} className="flex gap-4 items-start relative z-10">
                <div className="w-6 h-6 rounded-full bg-sun-yellow text-deep-navy flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm">
                  {sIdx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-deep-navy leading-tight">{step.instruction}</p>
                  <p className="text-[10px] font-black text-caribbean-blue uppercase tracking-widest mt-1">
                    Tramo: {step.duration} min
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RouteResults;
