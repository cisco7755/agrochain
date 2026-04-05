import { useState } from 'react';
import { ShieldCheck, Camera } from 'lucide-react';
import QRScanner from './QRScanner';
import ProductVerification from './ProductVerification';
import { parseQRPayload } from '../../utils/qrUtils';
import { shortenAddress } from '../../utils/hashUtils';
import toast from 'react-hot-toast';

const ConsumerDashboard = ({ account }) => {
  const [activeTab, setActiveTab] = useState('verify');
  const [scannedHash, setScannedHash] = useState('');

  const handleScan = (data) => {
    const payload = parseQRPayload(data);
    if (payload?.batchHash) {
      setScannedHash(payload.batchHash);
      setActiveTab('verify');
      toast.success('QR code scanned! Verifying...');
    } else {
      toast.error('Invalid QR code. This is not an AgroChain product QR.');
    }
  };

  const tabs = [
    { id: 'scan', label: 'Scan QR', icon: Camera },
    { id: 'verify', label: 'Verify Product', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Verify Product</h1>
              <p className="text-xs text-gray-500 font-mono">{shortenAddress(account)}</p>
            </div>
          </div>
          <span className="text-xs font-semibold bg-teal-100 text-teal-700 px-3 py-1 rounded-full">CONSUMER</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-800 font-medium">How to verify</p>
          <p className="text-xs text-green-700 mt-1">
            Scan the QR code on the product label, or paste the batch hash below to check authenticity directly on the blockchain.
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === id ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {activeTab === 'scan' && <QRScanner onScan={handleScan} />}
        {activeTab === 'verify' && <ProductVerification initialHash={scannedHash} />}
      </div>
    </div>
  );
};

export default ConsumerDashboard;
