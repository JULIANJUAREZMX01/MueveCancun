import React from 'react';

const RouteSearch: React.FC = () => {
  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <input
        type="text"
        placeholder="¿A dónde vas?"
        className="w-full p-2 border rounded"
      />
    </div>
  );
};

export default RouteSearch;
