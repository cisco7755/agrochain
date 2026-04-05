import { useState } from 'react';
import { useContract } from '../../hooks/useContract';
import TransactionStatus from '../shared/TransactionStatus';
import toast from 'react-hot-toast';

const RegisterFarm = ({ onFarmRegistered }) => {
  const [farmName, setFarmName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const { getProductTrace } = useContract();

  const handleRegister = async () => {
    if (!farmName.trim() || !location.trim()) {
      toast.error('Please enter farm name and location');
      return;
    }
    try {
      setLoading(true);
      setTxHash(null);
      const trace = getProductTrace(true);
      const toastId = toast.loading('Waiting for MetaMask confirmation...');
      const tx = await trace.registerFarm(farmName.trim(), location.trim());
      toast.loading('Registering farm on blockchain...', { id: toastId });
      const receipt = await tx.wait();
      toast.success('Farm registered successfully!', { id: toastId });
      setTxHash(receipt.transactionHash);
      setFarmName('');
      setLocation('');
      if (onFarmRegistered) onFarmRegistered();
    } catch (err) {
      if (err.code === 4001) toast.error('Transaction rejected in MetaMask.');
      else toast.error('Farm registration failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Register Your Farm</h2>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Farm Name</label>
          <input
            type="text"
            placeholder="e.g. Green Valley Organic Farm"
            value={farmName}
            onChange={(e) => setFarmName(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            type="text"
            placeholder="e.g. Minna, Niger State, Nigeria"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Registering...</>
          ) : 'Register Farm'}
        </button>
      </div>
      <TransactionStatus txHash={txHash} />
    </div>
  );
};

export default RegisterFarm;
