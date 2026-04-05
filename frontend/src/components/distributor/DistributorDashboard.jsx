import { useState } from 'react';
import { Truck, PackageCheck, History } from 'lucide-react';
import AssignedBatches from './AssignedBatches';
import ConfirmPickup from './ConfirmPickup';
import ConfirmDelivery from './ConfirmDelivery';
import { shortenAddress } from '../../utils/hashUtils';

const DistributorDashboard = ({ account }) => {
  const [activeTab, setActiveTab] = useState('batches');
  const [pickupBatch, setPickupBatch] = useState(null);
  const [deliveryBatch, setDeliveryBatch] = useState(null);

  const handleSelectPickup = (hash) => { setPickupBatch(hash); setActiveTab('action'); };
  const handleSelectDelivery = (hash) => { setDeliveryBatch(hash); setActiveTab('action'); };
  const handleDone = () => { setPickupBatch(null); setDeliveryBatch(null); setActiveTab('batches'); };

  const tabs = [
    { id: 'batches', label: 'My Batches', icon: Truck },
    { id: 'action', label: 'Confirm Action', icon: PackageCheck },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Distributor Dashboard</h1>
              <p className="text-xs text-gray-500 font-mono">{shortenAddress(account)}</p>
            </div>
          </div>
          <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-3 py-1 rounded-full">DISTRIBUTOR</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
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

        {activeTab === 'batches' && (
          <AssignedBatches
            account={account}
            onSelectPickup={handleSelectPickup}
            onSelectDelivery={handleSelectDelivery}
          />
        )}
        {activeTab === 'action' && (
          pickupBatch ? <ConfirmPickup batchHash={pickupBatch} onDone={handleDone} /> :
          deliveryBatch ? <ConfirmDelivery batchHash={deliveryBatch} onDone={handleDone} /> :
          <div className="bg-white rounded-lg shadow p-6 text-gray-500 text-sm">
            Select a batch from "My Batches" to confirm pickup or delivery.
          </div>
        )}
      </div>
    </div>
  );
};

export default DistributorDashboard;
