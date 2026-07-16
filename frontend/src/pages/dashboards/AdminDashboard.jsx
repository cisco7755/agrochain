import { useState, useEffect } from 'react';
import { Shield, Users, Package, Activity, Plus, X, CheckCircle, Loader2, Pencil, Clock, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useContract } from '../../hooks/useContract';
import { ROLE_NUMBERS } from '../../config/constants';
import toast from 'react-hot-toast';

const ROLES = ['FARMER', 'PROCESSOR', 'DISTRIBUTOR', 'RETAILER', 'CERTIFIER'];
const ROLE_NAMES = ['NONE', 'FARMER', 'PROCESSOR', 'DISTRIBUTOR', 'RETAILER', 'CERTIFIER'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { getAgroChain } = useContract();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState({ totalProducts: 0, totalActors: 0, totalEvents: 0 });
  const [actors, setActors] = useState([]);
  const [loadingActors, setLoadingActors] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingActor, setEditingActor] = useState(null); // actor being edited
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ eth_address: '', name: '', role: 'FARMER', location: '' });
  const [pending, setPending] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [approvingAddress, setApprovingAddress] = useState(null);

  const loadStats = async () => {
    try {
      const contract = getAgroChain();
      const total = await contract.getTotalProducts();
      const currentBlock = await contract.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 100000);
      const [actorEvents, eventEvents] = await Promise.all([
        contract.queryFilter(contract.filters.ActorRegistered(), fromBlock),
        contract.queryFilter(contract.filters.EventRecorded(), fromBlock),
      ]);
      setStats({ totalProducts: Number(total), totalActors: actorEvents.length, totalEvents: eventEvents.length });
    } catch (err) { console.error(err); }
  };

  const loadActors = async () => {
    setLoadingActors(true);
    try {
      const contract = getAgroChain();
      const currentBlock = await contract.provider.getBlockNumber();
      const events = await contract.queryFilter(
        contract.filters.ActorRegistered(),
        Math.max(0, currentBlock - 100000),
      );
      const details = await Promise.all(events.map(async (e) => {
        try {
          const addr = e.args.actorAddress || e.args[0];
          const a = await contract.getActor(addr);
          return { eth_address: addr, name: a.name, role: ROLE_NAMES[Number(a.role)] || 'NONE', location: a.location, isActive: a.isActive };
        } catch { return null; }
      }));
      const seen = new Map();
      details.filter(Boolean).forEach((a) => seen.set(a.eth_address.toLowerCase(), a));
      setActors([...seen.values()].reverse());
    } catch (err) { console.error(err); }
    finally { setLoadingActors(false); }
  };

  const loadPending = async () => {
    setLoadingPending(true);
    try {
      const contract = getAgroChain();
      const result = await contract.getPendingActors();
      setPending(result.map((a) => ({
        eth_address: a.actorAddress,
        name: a.name,
        role: ROLE_NAMES[Number(a.role)] || 'NONE',
        location: a.location,
        registeredAt: a.registeredAt ? Number(a.registeredAt) * 1000 : null,
      })));
    } catch (err) { console.error(err); }
    finally { setLoadingPending(false); }
  };

  const handleApprove = async (address) => {
    setApprovingAddress(address);
    try {
      const contract = getAgroChain(true);
      const toastId = toast.loading('Waiting for MetaMask…');
      const tx = await contract.approveActor(address);
      toast.loading('Approving on blockchain…', { id: toastId });
      await tx.wait();
      toast.success('Actor approved — they now have full access', { id: toastId });
      loadPending();
      if (tab === 'actors') loadActors();
      loadStats();
    } catch (err) {
      if (err.code === 4001) toast.error('Rejected in MetaMask.');
      else toast.error(err.message || 'Approval failed');
    } finally {
      setApprovingAddress(null);
    }
  };

  useEffect(() => { loadStats(); loadPending(); }, []);
  useEffect(() => { if (tab === 'actors') loadActors(); }, [tab]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const openNew = () => {
    setEditingActor(null);
    setForm({ eth_address: '', name: '', role: 'FARMER', location: '' });
    setShowForm(true);
  };

  const openEdit = (actor) => {
    setEditingActor(actor);
    setForm({ eth_address: actor.eth_address, name: actor.name, role: actor.role, location: actor.location });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingActor(null);
    setForm({ eth_address: '', name: '', role: 'FARMER', location: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.eth_address || !form.name || !form.location) { toast.error('All fields required'); return; }
    if (!/^0x[0-9a-fA-F]{40}$/.test(form.eth_address)) { toast.error('Invalid Ethereum address'); return; }
    setSubmitting(true);
    try {
      const contract = getAgroChain(true);
      const toastId = toast.loading('Waiting for MetaMask…');
      const tx = await contract.registerActor(form.eth_address, form.name.trim(), ROLE_NUMBERS[form.role], form.location.trim());
      toast.loading(editingActor ? 'Updating on blockchain…' : 'Registering on blockchain…', { id: toastId });
      await tx.wait();
      toast.success(
        editingActor ? `${form.name} updated successfully` : `${form.name} registered as ${form.role}`,
        { id: toastId },
      );
      closeForm();
      loadActors();
    } catch (err) {
      if (err.code === 4001) toast.error('Rejected in MetaMask.');
      else toast.error(err.message || 'Transaction failed');
    } finally { setSubmitting(false); }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'actors', label: 'Manage Actors', icon: Users },
    { id: 'pending', label: 'Pending Approvals', icon: Clock, badge: pending.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm">Welcome, {user?.name}</p>
          </div>
          <span className="ml-auto px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">ADMIN</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === id ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}>
              <Icon className="w-4 h-4" />{label}
              {!!badge && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  tab === id ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                }`}>{badge}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Package, label: 'Total Products', value: stats.totalProducts, color: 'bg-green-100 text-green-700' },
                { icon: Users, label: 'Registered Actors', value: stats.totalActors, color: 'bg-blue-100 text-blue-700' },
                { icon: Activity, label: 'Chain Events', value: stats.totalEvents, color: 'bg-purple-100 text-purple-700' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500 font-medium">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-base font-bold text-gray-900 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={() => setTab('actors')}
                  className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-100 rounded-xl hover:bg-purple-100 transition-colors text-left">
                  <Users className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-bold text-purple-800">Register Actor</p>
                    <p className="text-xs text-purple-600">Add farmers, processors, distributors…</p>
                  </div>
                </button>
                <a href="/recalls"
                  className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors">
                  <Shield className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm font-bold text-red-800">Manage Recalls</p>
                    <p className="text-xs text-red-600">Issue or resolve product recalls</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        )}

        {tab === 'actors' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Registered Actors ({actors.length})</h2>
              {!showForm && (
                <button onClick={openNew}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors">
                  <Plus className="w-4 h-4" /> Register Actor
                </button>
              )}
            </div>

            {showForm && (
              <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900">
                    {editingActor ? `Edit Actor — ${editingActor.name}` : 'Register New Actor on Blockchain'}
                  </h3>
                  <button onClick={closeForm} className="p-1.5 hover:bg-gray-100 rounded-lg">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Wallet Address *</label>
                    <input value={form.eth_address} onChange={set('eth_address')} placeholder="0x…" required
                      disabled={!!editingActor}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono disabled:bg-gray-50 disabled:text-gray-400" />
                    {editingActor && <p className="text-xs text-gray-400 mt-1">Wallet address cannot be changed</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Name *</label>
                    <input value={form.name} onChange={set('name')} placeholder="e.g. Green Valley Farms" required
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Role *</label>
                    <select value={form.role} onChange={set('role')}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500">
                      {ROLES.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Location *</label>
                    <input value={form.location} onChange={set('location')} placeholder="e.g. Abuja, Nigeria" required
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div className="sm:col-span-2 flex gap-3">
                    <button type="button" onClick={closeForm}
                      className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Cancel</button>
                    <button type="submit" disabled={submitting}
                      className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 rounded-xl">
                      {submitting
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> {editingActor ? 'Updating…' : 'Registering…'}</>
                        : <><CheckCircle className="w-4 h-4" /> {editingActor ? 'Save Changes' : 'Register'}</>}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {loadingActors ? (
                <div className="flex items-center justify-center py-12 gap-2 text-gray-400 text-sm">
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /> Loading…
                </div>
              ) : actors.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No actors registered yet</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {actors.map((a) => (
                    <div key={a.eth_address} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50">
                      <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-700 flex-shrink-0">
                        {a.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{a.name}</p>
                        <p className="text-xs text-gray-400 font-mono truncate">{a.eth_address}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">{a.role}</span>
                        <span className="text-xs text-gray-400 hidden sm:block">{a.location}</span>
                        <span className={`w-2 h-2 rounded-full ${a.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <button
                          onClick={() => openEdit(a)}
                          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Edit actor"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'pending' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Pending Approvals ({pending.length})</h2>
              <p className="text-xs text-gray-400 mt-0.5">Actors who self-registered and are waiting on approval — read-only until approved.</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {loadingPending ? (
                <div className="flex items-center justify-center py-12 gap-2 text-gray-400 text-sm">
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /> Loading…
                </div>
              ) : pending.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No pending registration requests</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {pending.map((a) => (
                    <div key={a.eth_address} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50">
                      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700 flex-shrink-0">
                        {a.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{a.name}</p>
                        <p className="text-xs text-gray-400 font-mono truncate">{a.eth_address}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-lg">{a.role}</span>
                        <span className="text-xs text-gray-400 hidden sm:block">{a.location}</span>
                        <button
                          onClick={() => handleApprove(a.eth_address)}
                          disabled={approvingAddress === a.eth_address}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-lg transition-colors"
                        >
                          {approvingAddress === a.eth_address
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Check className="w-3.5 h-3.5" />}
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
