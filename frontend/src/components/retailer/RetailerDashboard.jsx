import { useState } from 'react';
import { Store, PackagePlus, QrCode, Package } from 'lucide-react';
import ReceiveProduct from './ReceiveProduct';
import GenerateQR from './GenerateQR';
import Inventory from './Inventory';
import { shortenAddress } from '../../utils/hashUtils';

const RetailerDashboard = ({ account }) => {
  const [activeTab, setActiveTab] = useState('inventory');

  const tabs = [
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'receive', label: 'Receive Product', icon: PackagePlus },
    { id: 'qr', label: 'Generate QR', icon: QrCode },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Retailer Dashboard</h1>
              <p className="text-xs text-gray-500 font-mono">{shortenAddress(account)}</p>
            </div>
          </div>
          <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-3 py-1 rounded-full">RETAILER</span>
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

        {activeTab === 'inventory' && <Inventory account={account} />}
        {activeTab === 'receive' && <ReceiveProduct onDone={() => setActiveTab('inventory')} />}
        {activeTab === 'qr' && <GenerateQR />}
      </div>
    </div>
  );
};

export default RetailerDashboard;
