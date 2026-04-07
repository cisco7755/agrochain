import { useState } from 'react';
import { useContract } from '../../hooks/useContract';
import TransactionStatus from '../shared/TransactionStatus';
import toast from 'react-hot-toast';

const ReceiveProduct = ({ onDone }) => {
  const [batchHash, setBatchHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const { getAgroChain } = useContract();

  const handleReceipt = async () => {
    if (!batchHash.trim()) { toast.error('Please enter the batch hash'); return; }
    try {
      setLoading(true); setTxHash(null);
      const trace = getAgroChain(true);
      const toastId = toast.loading('Waiting for MetaMask confirmation...');
      const tx = await trace.confirmReceipt(batchHash.trim());
      toast.loading('Recording receipt on blockchain...', { id: toastId });
      const receipt = await tx.wait();
      toast.success('Product receipt confirmed!', { id: toastId });
      setTxHash(receipt.transactionHash);
      setBatchHash('');
      if (onDone) setTimeout(onDone, 2000);
    } catch (err) {
      if (err.code === 4001) toast.error('Transaction rejected in MetaMask.');
      else toast.error('Failed to confirm receipt. Please try again.');
      console.error(err);
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Confirm Product Receipt</h2>
      <p className="text-sm text-gray-600 mb-4">
        Enter the batch hash provided by the distributor to confirm you have received the product.
      </p>
      <div className="space-y-3">
        <input type="text" placeholder="Batch hash (0x...)"
          value={batchHash} onChange={e => setBatchHash(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm" />
        <button onClick={handleReceipt} disabled={loading}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Confirming...</>
          ) : 'Confirm Receipt'}
        </button>
      </div>
      <TransactionStatus txHash={txHash} />
    </div>
  );
};

export default ReceiveProduct;
