import { useState } from 'react';
import { useContract } from '../../hooks/useContract';
import { ROLE_NUMBERS } from '../../config/constants';
import { etherscanTxUrl } from '../../utils/hashUtils';
import TransactionStatus from '../shared/TransactionStatus';
import toast from 'react-hot-toast';

const RegisterActor = () => {
  const [address, setAddress] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const { getUserRegistry } = useContract();

  const handleRegister = async () => {
    if (!address || !selectedRole) {
      toast.error('Please enter a wallet address and select a role');
      return;
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      toast.error('Invalid Ethereum address format');
      return;
    }
    try {
      setLoading(true);
      setTxHash(null);
      const registry = getUserRegistry(true);
      const toastId = toast.loading('Waiting for MetaMask confirmation...');
      const tx = await registry.registerUser(address, ROLE_NUMBERS[selectedRole]);
      toast.loading('Transaction submitted. Waiting for confirmation...', { id: toastId });
      const receipt = await tx.wait();
      toast.success(`${selectedRole} registered successfully!`, { id: toastId });
      setTxHash(receipt.transactionHash);
      setAddress('');
      setSelectedRole('');
    } catch (err) {
      if (err.code === 4001) toast.error('Transaction rejected in MetaMask.');
      else if (err.message?.includes('Not authorised')) toast.error('You do not have admin permission.');
      else toast.error('Registration failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Register New Actor</h2>
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Wallet address (0x...)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
        />
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="">Select role</option>
          <option value="FARMER">Farmer</option>
          <option value="CERTIFIER">Certifier</option>
          <option value="DISTRIBUTOR">Distributor</option>
          <option value="RETAILER">Retailer</option>
          <option value="CONSUMER">Consumer</option>
        </select>
        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
          ) : 'Register Actor'}
        </button>
      </div>
      <TransactionStatus txHash={txHash} />
    </div>
  );
};

export default RegisterActor;
