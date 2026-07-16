import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useContract } from '../hooks/useContract';
import FarmerDashboard from './dashboards/FarmerDashboard';
import ProcessorDashboard from './dashboards/ProcessorDashboard';
import DistributorDashboard from './dashboards/DistributorDashboard';
import RetailerDashboard from './dashboards/RetailerDashboard';
import CertifierDashboard from './dashboards/CertifierDashboard';
import AdminDashboard from './dashboards/AdminDashboard';
import LocationInput from '../components/shared/LocationInput';
import { ROLE_NUMBERS } from '../config/constants';
import {
  Eye, Copy, Search, Sprout, Factory, Truck, ShoppingBag, Award,
  Clock, Loader2, RefreshCw, UserPlus,
} from 'lucide-react';
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
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'FARMER', location: '' });

  useEffect(() => {
    getAgroChain().admin().then(setAdminAddr).catch(() => {});
  }, []);

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!form.name || !form.location) {
      toast.error('Name and location are required');
      return;
    }
    setSubmitting(true);
    try {
      const contract = getAgroChain(true);
      const toastId = toast.loading('Waiting for MetaMask confirmation…');
      const tx = await contract.requestRegistration(
        form.name.trim(),
        ROLE_NUMBERS[form.role],
        form.location.trim(),
      );
      toast.loading('Submitting registration request…', { id: toastId });
      await tx.wait();
      toast.success('Request submitted — waiting on admin approval', { id: toastId });
      // Role resolution runs once on connect; reload picks up the new PENDING state.
      window.location.reload();
    } catch (err) {
      if (err.code === 4001) toast.error('Rejected in MetaMask.');
      else toast.error(err.message || 'Request failed');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
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

        {/* Self-registration */}
        <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="w-4 h-4 text-green-600" />
            <h2 className="text-base font-bold text-gray-900">Register as a Supply Chain Actor</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Submit your details below — an admin reviews and approves requests before your account becomes fully functional.
          </p>
          <form onSubmit={handleRequest} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Name *</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Green Valley Farms" required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Role *</label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500">
                {ROLES_INFO.map(({ role }) => <option key={role} value={role}>{role}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Location *</label>
              <LocationInput
                placeholder="e.g. Nairobi, Kenya"
                value={form.location}
                onChange={(val) => setForm((f) => ({ ...f, location: val }))}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-xl transition-colors">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><UserPlus className="w-4 h-4" /> Submit Registration Request</>}
              </button>
            </div>
          </form>
        </div>

        {/* Your wallet / admin fallback */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-1">Your Wallet Address</h2>
          <p className="text-xs text-gray-400 mb-3">Alternatively, share this with the admin to be registered directly</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <span className="flex-1 font-mono text-sm text-gray-800 break-all">{user?.address}</span>
            <button onClick={() => copy(user?.address)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors">
              <Copy className="w-3.5 h-3.5" />{copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          {adminAddr && (
            <div className="mt-4 pt-4 border-t border-gray-100">
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

function PendingDashboard() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const checkStatus = () => {
    setRefreshing(true);
    window.location.reload();
  };

  const cfg = ROLES_INFO.find((r) => r.role === user?.requestedRole);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Registration Pending Approval</h1>
          <p className="text-sm text-gray-500 mb-6">
            Your request has been submitted on-chain. You have read-only access until an admin approves it.
          </p>

          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-left space-y-2.5 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Name</span>
              <span className="text-sm font-semibold text-gray-800">{user?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Requested role</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg?.color || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                {cfg?.icon && <cfg.icon className="w-3 h-3" />}{user?.requestedRole}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Location</span>
              <span className="text-sm text-gray-700">{user?.location || '—'}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-500">Wallet</span>
              <span className="text-xs font-mono text-gray-600">{user?.address?.slice(0, 6)}…{user?.address?.slice(-4)}</span>
            </div>
          </div>

          <button onClick={checkStatus} disabled={refreshing}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 rounded-xl border border-amber-100 transition-colors">
            {refreshing ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</> : <><RefreshCw className="w-4 h-4" /> Check Approval Status</>}
          </button>
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
    case 'PENDING':     return <PendingDashboard />;
    default:            return <ViewerDashboard />;
  }
}
