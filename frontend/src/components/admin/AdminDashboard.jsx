import { useState } from 'react';
import { Users, Settings, Activity, ShieldCheck } from 'lucide-react';
import RegisterActor from './RegisterActor';
import AssignRole from './AssignRole';
import SystemLog from './SystemLog';
import { shortenAddress } from '../../utils/hashUtils';

const AdminDashboard = ({ account }) => {
  const [activeTab, setActiveTab] = useState('register');

  const tabs = [
    { id: 'register', label: 'Register Actor', icon: Users },
    { id: 'assign', label: 'Update Role', icon: Settings },
    { id: 'log', label: 'System Log', icon: Activity },
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
              <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-xs text-gray-500 font-mono">{shortenAddress(account)}</p>
            </div>
          </div>
          <span className="text-xs font-semibold bg-red-100 text-red-700 px-3 py-1 rounded-full">ADMIN</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === id
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'register' && <RegisterActor />}
        {activeTab === 'assign' && <AssignRole />}
        {activeTab === 'log' && <SystemLog />}
      </div>
    </div>
  );
};

export default AdminDashboard;
