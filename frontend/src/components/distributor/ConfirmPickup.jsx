import { useState } from 'react';
import { useContract } from '../../hooks/useContract';
import TransactionStatus from '../shared/TransactionStatus';
import toast from 'react-hot-toast';

const ConfirmPickup = ({ batchHash, onDone }) => {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const { getProductTrace } = useContract();

  const handlePickup = async () => {
    try {
      setLoading(true); setTxHash(null);
      const trace = getProductTrace(true);
      const toastId = toast.loading('Waiting for MetaMask confirmation...');
      const tx = await trace.confirmPickup(batchHash);
      toast.loading('Recording pickup on blockchain...', { id: toastId });
      const receipt = await tx.wait();
      toast.success('Pickup confirmed and recorded!', { id: toastId });
      setTxHash(receipt.transactionHash);
      if (onDone) setTimeout(onDone, 2000);
    } catch (err) {
      if (err.code === 4001) toast.error('Transaction rejected in MetaMask.');
      else toast.error('Failed to confirm pickup. Please try again.');
      console.error(err);
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Confirm Batch Pickup</h2>
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700 font-medium mb-1">Batch Hash</p>
        <p className="font-mono text-xs text-blue-800 break-all">{batchHash}</p>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Confirming pickup records the timestamp of collection on the blockchain. This creates an immutable custody record protecting both you and the farmer.
      </p>
      <button onClick={handlePickup} disabled={loading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
        {loading ? (
          <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Confirming...</>
        ) : 'Confirm Pickup'}
      </button>
      <TransactionStatus txHash={txHash} />
    </div>
  );
};

export default ConfirmPickup;
