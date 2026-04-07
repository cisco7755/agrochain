import { useState, useEffect } from 'react';
import { useContract } from '../../hooks/useContract';
import { BATCH_STATUS } from '../../config/constants';
import { shortenAddress, formatTimestamp } from '../../utils/hashUtils';
import toast from 'react-hot-toast';

const AssignedBatches = ({ account, onSelectPickup, onSelectDelivery }) => {
  const [batches, setBatches] = useState([]);
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const { getAgroChain } = useContract();

  useEffect(() => {
    const fetch = async () => {
      try {
        const trace = getAgroChain();
        const hashes = await trace.getBatchesForDistributor(account);
        setBatches(hashes);
        const deets = {};
        await Promise.all(hashes.map(async (h) => {
          try { deets[h] = await trace.verifyProduct(h); } catch {}
        }));
        setDetails(deets);
      } catch (err) {
        toast.error('Failed to load assigned batches');
      } finally { setLoading(false); }
    };
    fetch();
  }, [account]);

  if (loading) return (
    <div className="bg-white rounded-lg shadow p-6 flex items-center gap-2 text-gray-500 text-sm">
      <span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      Loading assigned batches...
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Assigned Batches ({batches.length})</h2>
      {batches.length === 0 ? (
        <p className="text-gray-500 text-sm">No batches assigned for delivery yet.</p>
      ) : (
        <div className="space-y-3">
          {batches.map((hash) => {
            const d = details[hash];
            const status = d ? parseInt(d.status) : 0;
            const canPickup = status === 1;
            const canDeliver = status === 3;
            return (
              <div key={hash} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{d?.productName || '...'}</p>
                    <p className="text-xs text-gray-500">{d?.farmName} · {d?.farmLocation}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    status === 1 ? 'bg-green-100 text-green-800' :
                    status === 3 ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {BATCH_STATUS[status]}
                  </span>
                </div>
                <div className="font-mono text-xs text-gray-400 bg-gray-50 rounded p-2 mb-3 break-all">{hash}</div>
                <div className="flex gap-2">
                  {canPickup && (
                    <button onClick={() => onSelectPickup && onSelectPickup(hash)}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                      Confirm Pickup
                    </button>
                  )}
                  {canDeliver && (
                    <button onClick={() => onSelectDelivery && onSelectDelivery(hash)}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors">
                      Confirm Delivery
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AssignedBatches;
