import { useState, useEffect } from 'react';
import { useContract } from '../../hooks/useContract';
import { BATCH_STATUS } from '../../config/constants';
import { formatTimestamp } from '../../utils/hashUtils';
import toast from 'react-hot-toast';

const CertificationHistory = ({ account }) => {
  const [batches, setBatches] = useState([]);
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const { getAgroChain } = useContract();

  useEffect(() => {
    const fetch = async () => {
      try {
        const trace = getAgroChain();
        const hashes = await trace.getCertificationsByCertifier(account);
        setBatches(hashes);
        const deets = {};
        await Promise.all(hashes.map(async (h) => {
          try { deets[h] = await trace.verifyProduct(h); } catch {}
        }));
        setDetails(deets);
      } catch (err) {
        toast.error('Failed to load certification history');
      } finally { setLoading(false); }
    };
    fetch();
  }, [account]);

  if (loading) return (
    <div className="bg-white rounded-lg shadow p-6 flex items-center gap-2 text-gray-500 text-sm">
      <span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      Loading history...
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Certification History ({batches.length})</h2>
      {batches.length === 0 ? (
        <p className="text-gray-500 text-sm">No certifications issued yet.</p>
      ) : (
        <div className="space-y-3">
          {batches.map((hash) => {
            const d = details[hash];
            const status = d ? parseInt(d.status) : 0;
            return (
              <div key={hash} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-1">
                  <p className="font-semibold text-gray-800">{d?.productName || '...'}</p>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${status === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {BATCH_STATUS[status]}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{d?.farmName} · {d?.farmLocation}</p>
                {d?.certificationDate && (
                  <p className="text-xs text-gray-400 mt-1">
                    Certified: {formatTimestamp(d.certificationDate.toNumber())}
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

export default CertificationHistory;
