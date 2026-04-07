import { useState } from 'react';
import { useContract } from '../../hooks/useContract';
import { ROLE_NUMBERS } from '../../config/constants';
import TransactionStatus from '../shared/TransactionStatus';
import toast from 'react-hot-toast';

const AssignRole = () => {
  const [address, setAddress] = useState('');
  const [newRole, setNewRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const { getAgroChain } = useContract();

  const handleAssign = async () => {
    if (!address || !newRole) {
      toast.error('Please enter a wallet address and select a new role');
      return;
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      toast.error('Invalid Ethereum address format');
      return;
    }
    try {
      setLoading(true);
      setTxHash(null);
      const registry = getAgroChain(true);
      const toastId = toast.loading('Waiting for MetaMask confirmation...');
      const tx = await registry.updateRole(address, ROLE_NUMBERS[newRole]);
      toast.loading('Submitting role update...', { id: toastId });
      const receipt = await tx.wait();
      toast.success('Role updated successfully!', { id: toastId });
      setTxHash(receipt.transactionHash);
      setAddress('');
      setNewRole('');
    } catch (err) {
      if (err.code === 4001) toast.error('Transaction rejected in MetaMask.');
      else toast.error('Role update failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Update Actor Role</h2>
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Wallet address (0x...)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
        />
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="">Select new role</option>
          <option value="NONE">Remove Access (NONE)</option>
          <option value="FARMER">Farmer</option>
          <option value="CERTIFIER">Certifier</option>
          <option value="DISTRIBUTOR">Distributor</option>
          <option value="RETAILER">Retailer</option>
          <option value="CONSUMER">Consumer</option>
        </select>
        <button
          onClick={handleAssign}
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
          ) : 'Update Role'}
        </button>
      </div>
      <TransactionStatus txHash={txHash} />
    </div>
  );
};

export default AssignRole;
