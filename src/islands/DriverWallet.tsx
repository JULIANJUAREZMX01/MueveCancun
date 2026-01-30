import { useState, useEffect } from 'react';
import { getWalletBalance, updateWalletBalance } from '../utils/db';

export default function DriverWallet() {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWallet();
  }, []);

  async function loadWallet() {
    try {
      const w = await getWalletBalance();
      if (w) setWallet(w);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load wallet', err);
      setLoading(false);
    }
  }

  async function addFunds(amount: number) {
    await updateWalletBalance(amount);
    await loadWallet();
  }

  if (loading) return <div className="text-gray-500">Cargando billetera...</div>;

  const balanceMxn = wallet?.balance_mxn || 0;
  const balanceUsd = wallet?.balance_usd || 0;
  const isBlocked = balanceMxn < 90; // $5 USD logic

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-sm text-gray-500 uppercase tracking-widest font-bold mb-1">Saldo Actual</div>
        <div className={`text-4xl font-black ${isBlocked ? 'text-red-500' : 'text-green-600'}`}>
          ${balanceMxn.toFixed(2)} <span className="text-lg text-gray-400">MXN</span>
        </div>
        <div className="text-sm text-gray-400 mt-1">
          ≈ ${balanceUsd.toFixed(2)} USD
        </div>
      </div>

      {isBlocked && (
        <div className="bg-red-100 text-red-800 p-3 rounded-lg text-center font-bold text-sm">
          ⛔ SERVICIO BLOQUEADO (Saldo &lt; $5 USD)
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => addFunds(50)}
          className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 px-4 rounded-lg shadow-sm transition-all"
        >
          + $50 MXN
        </button>
        <button 
          onClick={() => addFunds(200)}
          className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 px-4 rounded-lg shadow-sm transition-all"
        >
          + $200 MXN
        </button>
      </div>
      
      <div className="pt-4 border-t border-gray-100 text-center">
        <button 
            onClick={() => window.location.href = '/'}
            className="text-primary-600 text-sm font-bold hover:underline"
        >
            ← Volver al Mapa Público
        </button>
      </div>
    </div>
  );
}
