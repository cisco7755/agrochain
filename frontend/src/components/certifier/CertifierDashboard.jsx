import { useState } from 'react';
import { BadgeCheck, ClipboardList, History } from 'lucide-react';
import PendingRequests from './PendingRequests';
import IssueCertification from './IssueCertification';
import CertificationHistory from './CertificationHistory';
import { shortenAddress } from '../../utils/hashUtils';

const CertifierDashboard = ({ account }) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedBatch, setSelectedBatch] = useState(null);

  const handleSelect = (hash, data) => {
    setSelectedBatch({ hash, data });
    setActiveTab('certify');
  };

  const handleDone = () => {
    setSelectedBatch(null);
    setActiveTab('pending');
  };

  const tabs = [
    { id: 'pending', label: 'Pending', icon: ClipboardList },
    { id: 'certify', label: 'Review', icon: BadgeCheck },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <BadgeCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Certifier Dashboard</h1>
              <p className="text-xs text-gray-500 font-mono">{shortenAddress(account)}</p>
            </div>
          </div>
          <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">CERTIFIER</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === id ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {activeTab === 'pending' && <PendingRequests onSelect={handleSelect} />}
        {activeTab === 'certify' && (
          selectedBatch ? (
            <IssueCertification
              batchHash={selectedBatch.hash}
              batchData={selectedBatch.data}
              onDone={handleDone}
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-6 text-gray-500 text-sm">
              Select a batch from the Pending tab to review and certify it.
            </div>
          )
        )}
        {activeTab === 'history' && <CertificationHistory account={account} />}
      </div>
    </div>
  );
};

export default CertifierDashboard;
