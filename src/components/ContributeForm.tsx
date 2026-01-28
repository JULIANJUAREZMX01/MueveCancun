import React from 'react';

const ContributeForm: React.FC = () => {
  return (
    <form className="p-4 bg-sky-50 rounded-lg border border-sky-100">
      <h2 className="font-bold text-sky-900 mb-2">Ayúdanos a mejorar</h2>
      <textarea
        className="w-full p-2 text-sm border rounded"
        placeholder="Reporta un cambio en la ruta o tarifa..."
      />
      <button className="mt-2 bg-sky-600 text-white px-4 py-2 rounded text-sm">
        Enviar Reporte
      </button>
    </form>
  );
};

export default ContributeForm;
