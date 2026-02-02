import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageSquare } from 'lucide-react';

const ContribuirPage: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      <div className="text-center space-y-2">
        <Heart className="w-12 h-12 text-coral mx-auto" />
        <h2 className="text-3xl font-bold text-deep-navy">Tu voz importa</h2>
        <p className="text-gray-600">Ayúdanos a mejorar el transporte en Cancún</p>
      </div>

      <div className="sunny-card p-6 space-y-4">
        <h3 className="text-xl font-bold text-deep-navy flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-caribbean-blue" /> Reportar Problema
        </h3>
        <p className="text-sm text-gray-600">
          ¿La ruta no pasó? ¿El chofer fue imprudente? ¿O simplemente quieres sugerir una mejora?
        </p>
        <textarea
          placeholder="Escribe tu comentario aquí..."
          className="w-full p-3 border border-gray-300 rounded-xl min-h-[120px] outline-none focus:ring-2 focus:ring-caribbean-blue"
        />
        <button className="premium-button w-full">Enviar Reporte</button>
      </div>

      <div className="text-center">
        <Link to="/" className="text-caribbean-blue hover:underline">Volver al inicio</Link>
      </div>
    </div>
  );
};

export default ContribuirPage;
