import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useContract } from '../hooks/useContract';
import FarmerDashboard from './dashboards/FarmerDashboard';
import ProcessorDashboard from './dashboards/ProcessorDashboard';
import DistributorDashboard from './dashboards/DistributorDashboard';
import RetailerDashboard from './dashboards/RetailerDashboard';
import CertifierDashboard from './dashboards/CertifierDashboard';
import AdminDashboard from './dashboards/AdminDashboard';
import { Eye, Copy, Search, Sprout, Factory, Truck, ShoppingBag, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const ROLES_INFO = [
  { role: 'FARMER',      icon: Sprout,      color: 'bg-green-100 text-green-700 border-green-200',   desc: 'Register agricultural products on the blockchain' },
  { role: 'PROCESSOR',   icon: Factory,     color: 'bg-blue-100 text-blue-700 border-blue-200',     desc: 'Record processing and packaging events' },
  { role: 'DISTRIBUTOR', icon: Truck,       color: 'bg-indigo-100 text-indigo-700 border-indigo-200',desc: 'Record shipping and logistics events' },
  { role: 'RETAILER',    icon: ShoppingBag, color: 'bg-pink-100 text-pink-700 border-pink-200',     desc: 'Record retail and sale events' },
  { role: 'CERTIFIER',   icon: Award,       color: 'bg-amber-100 text-amber-700 border-amber-200',  desc: 'Certify products as organic or quality-verified' },
];

function ViewerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getAgroChain } = useContract();
  const [adminAddr, setAdminAddr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getAgroChain().admin().then(setAdminAddr).catch(() => {});
  }, []);

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <Eye className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome to AgroChain</h1>
            <p className="text-gray-500 text-sm">Your wallet is connected but not yet registered</p>
          </div>
          <span className="ml-auto px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">VIEWER</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Your wallet */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-1">Your Wallet Address</h2>
          <p className="text-xs text-gray-400 mb-3">Share this address with the admin to get registered</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <span className="flex-1 font-mono text-sm text-gray-800 break-all">{user?.address}</span>
            <button onClick={() => copy(user?.address)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors">
              <Copy className="w-3.5 h-3.5" />{copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* How to get registered */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">How to Get Registered</h2>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Copy your wallet address above' },
              { step: '2', text: 'Send it to the AgroChain admin with your name, location, and desired role' },
              { step: '3', text: 'The admin will register your address on the blockchain' },
              { step: '4', text: 'Reconnect your wallet — your role will load automatically' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{step}</div>
                <p className="text-sm text-gray-700">{text}</p>
              </div>
            ))}
          </div>

          {adminAddr && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-1">Admin Wallet Address</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-gray-600 break-all">{adminAddr}</span>
                <button onClick={() => copy(adminAddr)} className="flex-shrink-0 p-1.5 hover:bg-gray-100 rounded-lg">
                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Available roles */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Available Roles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ROLES_INFO.map(({ role, icon: Icon, color, desc }) => (
              <div key={role} className={`flex items-start gap-3 p-3 rounded-xl border ${color}`}>
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold">{role}</p>
                  <p className="text-xs opacity-75 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Still can track */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3">
          <Search className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-green-800">You can still track products</p>
            <p className="text-xs text-green-700 mt-0.5 mb-3">Use the Track page to verify any product's full blockchain history without needing a role.</p>
            <button onClick={() => navigate('/track')}
              className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700">
              Go to Track →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  switch (user?.role) {
    case 'FARMER':      return <FarmerDashboard />;
    case 'PROCESSOR':   return <ProcessorDashboard />;
    case 'DISTRIBUTOR': return <DistributorDashboard />;
    case 'RETAILER':    return <RetailerDashboard />;
    case 'CERTIFIER':   return <CertifierDashboard />;
    case 'ADMIN':       return <AdminDashboard />;
    default:            return <ViewerDashboard />;
  }
}
