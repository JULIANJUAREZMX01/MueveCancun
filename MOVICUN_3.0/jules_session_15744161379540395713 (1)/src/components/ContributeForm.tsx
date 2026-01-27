import React, { useState } from 'react';

const ContributeForm: React.FC = () => {
  const [formData, setFormData] = useState({
    routeName: '',
    details: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Contribute data:', formData);
    alert('¡Gracias por tu contribución! La revisaremos pronto.');
    setFormData({ routeName: '', details: '' });
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-700 mt-8">
      <h2 className="text-xl font-bold mb-4">¿Conoces una ruta que no está aquí?</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre de la ruta</label>
          <input
            type="text"
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={formData.routeName}
            onChange={(e) => setFormData({ ...formData, routeName: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Detalles (paradas, tarifa, etc.)</label>
          <textarea
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            rows={3}
            value={formData.details}
            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
            required
          />
        </div>
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Enviar sugerencia
        </button>
      </form>
    </div>
  );
};

export default ContributeForm;
