import { useState, useEffect } from 'react';
import { useContract } from '../../hooks/useContract';
import { BATCH_STATUS } from '../../config/constants';
import { shortenHash, formatTimestamp, etherscanTxUrl } from '../../utils/hashUtils';
import toast from 'react-hot-toast';

const statusColors = {
  0: 'bg-yellow-100 text-yellow-800',
  1: 'bg-green-100 text-green-800',
  2: 'bg-red-100 text-red-800',
  3: 'bg-blue-100 text-blue-800',
  4: 'bg-purple-100 text-purple-800',
  5: 'bg-indigo-100 text-indigo-800',
  6: 'bg-emerald-100 text-emerald-800',
};

const BatchHistory = ({ account }) => {
  const [batches, setBatches] = useState([]);
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const { getProductTrace } = useContract();

  useEffect(() => {
    const fetch = async () => {
      if (!account) return;
      try {
        const trace = getProductTrace();
        const hashes = await trace.getBatchesByFarmer(account);
        setBatches(hashes);
        const deets = {};
        await Promise.all(hashes.map(async (h) => {
          try {
            const record = await trace.verifyProduct(h);
            deets[h] = record;
          } catch {}
        }));
        setDetails(deets);
      } catch (err) {
        toast.error('Failed to load batch history');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [account]);

  if (loading) return (
    <div className="bg-white rounded-lg shadow p-6 flex items-center gap-2 text-gray-500 text-sm">
      <span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      Loading your batches...
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">My Batch History ({batches.length})</h2>
      {batches.length === 0 ? (
        <p className="text-gray-500 text-sm">No batches created yet. Use the Create Batch tab to get started.</p>
      ) : (
        <div className="space-y-3">
          {batches.map((hash) => {
            const d = details[hash];
            const status = d ? parseInt(d.status) : 0;
            return (
              <div key={hash} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{d?.productName || 'Loading...'}</p>
                    <p className="text-xs text-gray-500">{d?.category}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
                    {BATCH_STATUS[status]}
                  </span>
                </div>
                <div className="font-mono text-xs text-gray-500 bg-gray-50 rounded p-2 break-all">
                  {hash}
                </div>
                {d && (
                  <p className="text-xs text-gray-500 mt-2">
                    Harvest: {formatTimestamp(d.harvestDate.toNumber())}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BatchHistory;
