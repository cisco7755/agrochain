import { useState, useEffect } from 'react';
import { useContract } from '../../hooks/useContract';
import { shortenHash, shortenAddress, formatTimestamp } from '../../utils/hashUtils';
import toast from 'react-hot-toast';

const PendingRequests = ({ onSelect }) => {
  const [pending, setPending] = useState([]);
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const { getAgroChain } = useContract();

  useEffect(() => {
    const fetch = async () => {
      try {
        const trace = getAgroChain();
        const hashes = await trace.getPendingCertifications();
        setPending(hashes);
        const deets = {};
        await Promise.all(hashes.map(async (h) => {
          try { deets[h] = await trace.verifyProduct(h); } catch {}
        }));
        setDetails(deets);
      } catch (err) {
        toast.error('Failed to load pending certifications');
        console.error(err);
      } finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return (
    <div className="bg-white rounded-lg shadow p-6 flex items-center gap-2 text-gray-500 text-sm">
      <span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      Loading pending requests...
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Pending Certifications ({pending.length})</h2>
      {pending.length === 0 ? (
        <p className="text-gray-500 text-sm">No batches awaiting certification.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((hash) => {
            const d = details[hash];
            return (
              <div key={hash} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{d?.productName || '...'}</p>
                    <p className="text-xs text-gray-500">{d?.category} · {d?.farmName}</p>
                    <p className="text-xs text-gray-400">{d?.farmLocation}</p>
                  </div>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">Pending</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Farmer: {d ? shortenAddress(d.farmer) : '...'} ·
                  Harvest: {d ? formatTimestamp(d.harvestDate?.toNumber()) : '...'}
                </p>
                <div className="font-mono text-xs text-gray-400 bg-gray-50 rounded p-2 mb-3 break-all">{hash}</div>
                <button
                  onClick={() => onSelect && onSelect(hash, d)}
                  className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Review &amp; Certify
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PendingRequests;
