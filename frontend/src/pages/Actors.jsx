import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Users, Plus, X, Loader2, User, MapPin, Hash,
  Sprout, Truck, ShoppingBag, Award, Factory, CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useContract } from '../hooks/useContract';
import { ROLE_NUMBERS } from '../config/constants';
import { formatTimestamp } from '../utils/hashUtils';

const ROLES = ['FARMER', 'PROCESSOR', 'DISTRIBUTOR', 'RETAILER', 'CERTIFIER'];

const ROLE_CONFIG = {
  FARMER:      { color: 'bg-green-100 text-green-800 border-green-200',   icon: Sprout,      dot: 'bg-green-500' },
  PROCESSOR:   { color: 'bg-blue-100 text-blue-800 border-blue-200',      icon: Factory,     dot: 'bg-blue-500' },
  DISTRIBUTOR: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200',icon: Truck,       dot: 'bg-indigo-500' },
  RETAILER:    { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: ShoppingBag, dot: 'bg-purple-500' },
  CERTIFIER:   { color: 'bg-amber-100 text-amber-800 border-amber-200',   icon: Award,       dot: 'bg-amber-500' },
};

const ROLE_NAMES = ['NONE', 'FARMER', 'PROCESSOR', 'DISTRIBUTOR', 'RETAILER', 'CERTIFIER'];

function truncate(str, n = 16) {
  if (!str || str.length <= n) return str || '—';
  return `${str.slice(0, 8)}…${str.slice(-6)}`;
}

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || {};
  const Icon = cfg.icon || User;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon className="w-3 h-3" />{role}
    </span>
  );
}

export default function Actors() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { getAgroChain } = useContract();

  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ eth_address: '', name: '', role: 'FARMER', location: '' });

  const load = async () => {
    setLoading(true);
    try {
      const contract = getAgroChain();
      const provider = contract.provider;
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 100000);

      const events = await contract.queryFilter(
        contract.filters.ActorRegistered(),
        fromBlock,
      );

      const details = await Promise.all(
        events.map(async (e) => {
          try {
            const addr = e.args.actorAddress || e.args[0];
            const actor = await contract.getActor(addr);
            return {
              eth_address: addr,
              name: actor.name,
              role: ROLE_NAMES[Number(actor.role)] || 'NONE',
              location: actor.location,
              is_active: actor.isActive,
              registered_at: actor.registeredAt ? Number(actor.registeredAt) * 1000 : null,
            };
          } catch { return null; }
        })
      );

      // Deduplicate by address (keep latest)
      const seen = new Map();
      details.filter(Boolean).forEach((a) => seen.set(a.eth_address.toLowerCase(), a));
      setActors([...seen.values()].reverse());
    } catch (err) {
      toast.error('Failed to load actors');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.eth_address || !form.name || !form.location) {
      toast.error('Address, name and location are required');
      return;
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(form.eth_address)) {
      toast.error('Invalid Ethereum address format');
      return;
    }
    setSubmitting(true);
    try {
      const contract = getAgroChain(true);
      const toastId = toast.loading('Waiting for MetaMask confirmation…');
      const tx = await contract.registerActor(
        form.eth_address,
        form.name.trim(),
        ROLE_NUMBERS[form.role],
        form.location.trim(),
      );
      toast.loading('Recording on blockchain…', { id: toastId });
      await tx.wait();
      toast.success(`${form.name} registered as ${form.role}`, { id: toastId });
      setForm({ eth_address: '', name: '', role: 'FARMER', location: '' });
      setShowForm(false);
      load();
    } catch (err) {
      if (err.code === 4001) toast.error('Transaction rejected in MetaMask.');
      else if (err.message?.includes('Not authorised')) toast.error('Only admin can register actors.');
      else toast.error(err.message || 'Registration failed');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const roleCounts = ROLES.reduce((acc, r) => {
    acc[r] = actors.filter((a) => a.role === r).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Supply Chain Actors</h1>
            <p className="text-gray-500 text-sm mt-0.5">Registered participants in the AgroChain network</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors shadow-sm ${
                showForm ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Register Actor</>}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Role Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {ROLES.map((role) => {
            const cfg = ROLE_CONFIG[role];
            const Icon = cfg.icon;
            return (
              <div key={role} className={`flex items-center gap-3 p-3 rounded-xl border ${cfg.color} bg-opacity-50`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-lg font-bold">{roleCounts[role]}</p>
                  <p className="text-xs font-semibold capitalize">{role.toLowerCase()}s</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Registration Form */}
        {isAdmin && showForm && (
          <div className="bg-white rounded-xl border border-green-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Plus className="w-4 h-4 text-green-600" /> Register New Actor on Blockchain
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Wallet Address *</label>
                  <input value={form.eth_address} onChange={set('eth_address')} placeholder="0x..." required
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Name *</label>
                  <input value={form.name} onChange={set('name')} placeholder="e.g. Green Valley Farms" required
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Role *</label>
                  <select value={form.role} onChange={set('role')}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Location *</label>
                  <input value={form.location} onChange={set('location')} placeholder="e.g. Nairobi, Kenya" required
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-xl transition-colors">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering…</> : <><CheckCircle className="w-4 h-4" /> Register</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Actors Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-bold text-gray-700">{actors.length} Registered Actors</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
            </div>
          ) : actors.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium text-sm">No actors registered yet</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                      <th className="text-left px-5 py-3">Name</th>
                      <th className="text-left px-5 py-3">Role</th>
                      <th className="text-left px-5 py-3">Location</th>
                      <th className="text-left px-5 py-3">ETH Address</th>
                      <th className="text-left px-5 py-3">Registered</th>
                      <th className="text-left px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {actors.map((actor) => {
                      const cfg = ROLE_CONFIG[actor.role] || {};
                      return (
                        <tr key={actor.eth_address} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${cfg.color}`}>
                                {actor.name?.charAt(0) || '?'}
                              </div>
                              <span className="font-semibold text-gray-900">{actor.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5"><RoleBadge role={actor.role} /></td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />{actor.location || '—'}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {truncate(actor.eth_address)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 text-xs">
                            {actor.registered_at ? new Date(actor.registered_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${actor.is_active ? 'text-green-700' : 'text-gray-400'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${actor.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                              {actor.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-gray-50">
                {actors.map((actor) => (
                  <div key={actor.eth_address} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">{actor.name}</span>
                      <RoleBadge role={actor.role} />
                    </div>
                    {actor.location && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <MapPin className="w-3.5 h-3.5" /> {actor.location}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Hash className="w-3 h-3" />
                      <span className="font-mono">{truncate(actor.eth_address)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
