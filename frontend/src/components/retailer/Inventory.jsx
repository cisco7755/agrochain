import { useState, useEffect } from 'react';
import { useContract } from '../../hooks/useContract';
import { BATCH_STATUS } from '../../config/constants';
import { shortenHash } from '../../utils/hashUtils';
import toast from 'react-hot-toast';

const Inventory = ({ account }) => {
  const [inventory, setInventory] = useState([]);
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const { getAgroChain } = useContract();

  useEffect(() => {
    const fetch = async () => {
      try {
        const trace = getAgroChain();
        const hashes = await trace.getInventoryByRetailer(account);
        setInventory(hashes);
        const deets = {};
        await Promise.all(hashes.map(async (h) => {
          try { deets[h] = await trace.verifyProduct(h); } catch {}
        }));
        setDetails(deets);
      } catch (err) {
        toast.error('Failed to load inventory');
      } finally { setLoading(false); }
    };
    fetch();
  }, [account]);

  if (loading) return (
    <div className="bg-white rounded-lg shadow p-6 flex items-center gap-2 text-gray-500 text-sm">
      <span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      Loading inventory...
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">My Inventory ({inventory.length})</h2>
      {inventory.length === 0 ? (
        <p className="text-gray-500 text-sm">Your inventory is empty. Confirm product receipts to add items.</p>
      ) : (
        <div className="space-y-3">
          {inventory.map((hash) => {
            const d = details[hash];
            const status = d ? parseInt(d.status) : 0;
            return (
              <div key={hash} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-semibold text-gray-800">{d?.productName || '...'}</p>
                    <p className="text-xs text-gray-500">{d?.category} · {d?.farmName}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    status === 6 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {BATCH_STATUS[status]}
                  </span>
                </div>
                <p className="font-mono text-xs text-gray-400 mt-2">{shortenHash(hash, 10)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Inventory;
