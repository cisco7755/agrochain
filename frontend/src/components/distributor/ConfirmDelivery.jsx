import { useState } from 'react';
import { useContract } from '../../hooks/useContract';
import TransactionStatus from '../shared/TransactionStatus';
import toast from 'react-hot-toast';

const ConfirmDelivery = ({ batchHash, onDone }) => {
  const [retailerAddress, setRetailerAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const { getAgroChain } = useContract();

  const handleDelivery = async () => {
    if (!retailerAddress) { toast.error('Please enter the retailer wallet address'); return; }
    if (!/^0x[0-9a-fA-F]{40}$/.test(retailerAddress)) {
      toast.error('Invalid Ethereum address format'); return;
    }
    try {
      setLoading(true); setTxHash(null);
      const trace = getAgroChain(true);
      const toastId = toast.loading('Waiting for MetaMask confirmation...');
      const tx = await trace.confirmDelivery(batchHash, retailerAddress);
      toast.loading('Recording delivery on blockchain...', { id: toastId });
      const receipt = await tx.wait();
      toast.success('Delivery confirmed and recorded!', { id: toastId });
      setTxHash(receipt.transactionHash);
      setRetailerAddress('');
      if (onDone) setTimeout(onDone, 2000);
    } catch (err) {
      if (err.code === 4001) toast.error('Transaction rejected in MetaMask.');
      else toast.error('Failed to confirm delivery. Please try again.');
      console.error(err);
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Confirm Delivery</h2>
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700 font-medium mb-1">Batch Hash</p>
        <p className="font-mono text-xs text-blue-800 break-all">{batchHash}</p>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Retailer Wallet Address</label>
          <input type="text" placeholder="0x... (retailer's Ethereum address)"
            value={retailerAddress} onChange={e => setRetailerAddress(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm" />
        </div>
        <button onClick={handleDelivery} disabled={loading}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Confirming...</>
          ) : 'Confirm Delivery'}
        </button>
      </div>
      <TransactionStatus txHash={txHash} />
    </div>
  );
};

export default ConfirmDelivery;
