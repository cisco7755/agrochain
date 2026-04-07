import { useState, useEffect } from 'react';
import { Sprout, Plus, History, Home } from 'lucide-react';
import RegisterFarm from './RegisterFarm';
import CreateBatch from './CreateBatch';
import BatchHistory from './BatchHistory';
import { useContract } from '../../hooks/useContract';
import { shortenAddress } from '../../utils/hashUtils';

const FarmerDashboard = ({ account }) => {
  const [activeTab, setActiveTab] = useState('farm');
  const [actor, setActor] = useState(null);
  const { getAgroChain } = useContract();

  useEffect(() => {
    const load = async () => {
      if (!account) return;
      try {
        const contract = getAgroChain();
        const data = await contract.getActor(account);
        setActor(data);
      } catch {}
    };
    load();
  }, [account]);

  const tabs = [
    { id: 'farm', label: 'My Farm', icon: Home },
    { id: 'create', label: 'New Product', icon: Plus },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {actor?.name || 'Farmer Dashboard'}
              </h1>
              <p className="text-xs text-gray-500 font-mono">{shortenAddress(account)}</p>
            </div>
          </div>
          <span className="text-xs font-semibold bg-green-100 text-green-700 px-3 py-1 rounded-full">FARMER</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {actor?.location && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Sprout className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">{actor.name}</p>
              <p className="text-xs text-green-600">{actor.location}</p>
            </div>
          </div>
        )}

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

        {activeTab === 'farm' && <RegisterFarm account={account} />}
        {activeTab === 'create' && <CreateBatch actorLocation={actor?.location} />}
        {activeTab === 'history' && <BatchHistory account={account} />}
      </div>
    </div>
  );
};

export default FarmerDashboard;
