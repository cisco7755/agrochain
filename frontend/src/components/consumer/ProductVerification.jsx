import { useState } from 'react';
import { useContract } from '../../hooks/useContract';
import { formatTimestamp, shortenAddress } from '../../utils/hashUtils';
import { ShieldCheck, ShieldAlert, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Field = ({ label, value }) => (
  <div className="flex justify-between border-b border-gray-100 py-2">
    <span className="text-gray-500 text-sm">{label}</span>
    <span className="text-gray-800 text-sm font-medium text-right max-w-[55%] break-all">{value || '—'}</span>
  </div>
);

const ProductVerification = ({ initialHash = '' }) => {
  const [batchHash, setBatchHash] = useState(initialHash);
  const [result, setResult] = useState(null);
  const [verified, setVerified] = useState(null);
  const [loading, setLoading] = useState(false);
  const { getAgroChain } = useContract();

  const handleVerify = async () => {
    const hash = batchHash.trim();
    if (!hash) { toast.error('Please enter or scan a batch hash'); return; }
    try {
      setLoading(true); setResult(null); setVerified(null);
      const trace = getAgroChain();
      const record = await trace.verifyProduct(hash);
      if (!record.exists) {
        setVerified(false);
      } else {
        setResult(record);
        setVerified(true);
      }
    } catch (err) {
      setVerified(false);
      console.error(err);
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Verify Product</h2>
      <div className="flex gap-2 mb-4">
        <input type="text" placeholder="Batch hash (0x...) or paste from QR scan"
          value={batchHash} onChange={e => setBatchHash(e.target.value)}
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm" />
        <button onClick={handleVerify} disabled={loading}
          className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap">
          {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {loading ? '' : 'Verify'}
        </button>
      </div>

      {verified === false && (
        <div className="rounded-xl border-2 border-red-500 bg-red-50 p-6 text-center">
          <ShieldAlert className="w-16 h-16 text-red-600 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-red-700 mb-2">FRAUD WARNING</h3>
          <p className="text-red-800 text-sm font-medium">
            This product could not be verified on the AgroChain blockchain. Do not purchase.
          </p>
        </div>
      )}

      {verified === true && result && (
        <div className="rounded-xl border-2 border-green-500 bg-green-50 p-5">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-green-200">
            <CheckCircle className="w-10 h-10 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-lg font-bold text-green-800">VERIFIED</p>
              <p className="text-sm text-green-600">Authentic product — blockchain verified</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Product</p>
            <Field label="Name" value={result.productName} />
            <Field label="Category" value={result.category} />
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Origin</p>
            <Field label="Farm" value={result.farmName} />
            <Field label="Location" value={result.farmLocation} />
            <Field label="Farmer" value={shortenAddress(result.farmer)} />
            <Field label="Harvest Date" value={formatTimestamp(result.harvestDate?.toNumber())} />
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Certification</p>
            <Field label="Certificate ID" value={result.certificationId} />
            <Field label="Certifier" value={shortenAddress(result.certifier)} />
            <Field label="Certified On" value={formatTimestamp(result.certificationDate?.toNumber())} />
          </div>

          {result.distributor && result.distributor !== '0x0000000000000000000000000000000000000000' && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Distribution</p>
              <Field label="Distributor" value={shortenAddress(result.distributor)} />
              <Field label="Pickup" value={formatTimestamp(result.pickupDate?.toNumber())} />
              <Field label="Delivery" value={formatTimestamp(result.deliveryDate?.toNumber())} />
            </div>
          )}

          {result.retailer && result.retailer !== '0x0000000000000000000000000000000000000000' && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Retail</p>
              <Field label="Retailer" value={shortenAddress(result.retailer)} />
              <Field label="Listed" value={formatTimestamp(result.listingDate?.toNumber())} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductVerification;
