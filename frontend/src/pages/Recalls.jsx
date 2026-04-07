import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle, Plus, X, Loader2, Package, Calendar, User, ShieldAlert } from 'lucide-react';
import { getRecalls, issueRecall, resolveRecall } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useContract } from '../hooks/useContract';

const SEVERITY_CONFIG = {
  LOW: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-400', label: 'Low' },
  MEDIUM: { color: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-400', label: 'Medium' },
  HIGH: { color: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500', label: 'High' },
  CRITICAL: { color: 'bg-red-200 text-red-900 border-red-300', dot: 'bg-red-700', label: 'Critical' },
};

function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
}

export default function Recalls() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getAgroChain } = useContract();
  const isAdmin = user?.role === 'ADMIN';
  const [recalls, setRecalls] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ product_id: '', reason: '', severity: 'HIGH', issued_by: '', details: '' });

  const load = async () => {
    try {
      const contract = getAgroChain();
      const currentBlock = await contract.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 100000);

      const [r, registeredEvents] = await Promise.all([
        getRecalls(),
        contract.queryFilter(contract.filters.ProductRegistered(), fromBlock),
      ]);

      // Load product details from blockchain
      const productDetails = await Promise.all(
        registeredEvents.map(async (e) => {
          const id = e.args.productId || e.args[0];
          try {
            const p = await contract.getProduct(id);
            return { id: Number(p.productId), name: p.name, batch_number: p.batchNumber };
          } catch { return null; }
        }),
      );

      setRecalls(r);
      setProducts(productDetails.filter(Boolean));
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const set = (f) => (e) => setForm((v) => ({ ...v, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_id || !form.reason || !form.issued_by) { toast.error('Please fill required fields'); return; }
    setSubmitting(true);
    try {
      await issueRecall({ ...form, product_id: parseInt(form.product_id) });
      toast.success('Recall issued and recorded on blockchain');
      setShowForm(false);
      setForm({ product_id: '', reason: '', severity: 'HIGH', issued_by: '', details: '' });
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleResolve = async (id) => {
    if (!confirm('Mark this recall as resolved?')) return;
    try {
      await resolveRecall(id);
      toast.success('Recall resolved');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const active = recalls.filter((r) => !r.is_resolved);
  const resolved = recalls.filter((r) => r.is_resolved);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-red-700 text-white px-4 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Recall Management</h1>
              <p className="text-red-200 text-sm mt-0.5">Issue and track product recalls on blockchain</p>
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => setShowForm((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors ${showForm ? 'bg-white/20 hover:bg-white/30' : 'bg-white text-red-700 hover:bg-red-50'}`}>
              {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Issue Recall</>}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Recalls', value: recalls.length, color: 'bg-gray-100 text-gray-700' },
            { label: 'Active', value: active.length, color: 'bg-red-100 text-red-700' },
            { label: 'Critical', value: recalls.filter((r) => r.severity === 'CRITICAL' && !r.is_resolved).length, color: 'bg-red-200 text-red-900' },
            { label: 'Resolved', value: resolved.length, color: 'bg-green-100 text-green-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`${color} rounded-xl p-4 text-center`}>
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-xs font-semibold mt-1 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>

        {/* Issue Recall Form */}
        {isAdmin && showForm && (
          <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6 animate-slide-down">
            <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" /> Issue New Recall
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Product *</label>
                <select value={form.product_id} onChange={set('product_id')} required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Select product…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.batch_number})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Severity *</label>
                <select value={form.severity} onChange={set('severity')}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                  {Object.keys(SEVERITY_CONFIG).map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Recall Reason *</label>
                <input value={form.reason} onChange={set('reason')} required
                  placeholder="e.g. E. coli contamination detected in batch sample"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Issued By *</label>
                <input value={form.issued_by} onChange={set('issued_by')} required
                  placeholder="e.g. Kenya Food Safety Authority"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Additional Details</label>
                <input value={form.details} onChange={set('details')}
                  placeholder="Consumer instructions, return procedure…"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div className="col-span-2 flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-xl">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Issuing…</> : <><AlertTriangle className="w-4 h-4" /> Issue Recall</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Active Recalls */}
        {active.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" /> Active Recalls ({active.length})
            </h2>
            <div className="space-y-3">
              {active.map((r) => {
                const sev = SEVERITY_CONFIG[r.severity] || SEVERITY_CONFIG.MEDIUM;
                return (
                  <div key={r.id} className="bg-white rounded-xl border border-red-100 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${sev.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} /> {sev.label} Severity
                          </span>
                          <span className="text-xs text-gray-400">#{r.id}</span>
                        </div>
                        <p className="font-bold text-gray-900 mb-1">{r.reason}</p>
                        {r.details && <p className="text-sm text-gray-500 mb-2">{r.details}</p>}
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Package className="w-3 h-3" /> Product #{r.product_id}</span>
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {r.issued_by}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(r.recalled_at)}</span>
                        </div>
                        {r.blockchain_tx_hash && (
                          <p className="text-xs font-mono text-gray-400 mt-2 truncate">TX: {r.blockchain_tx_hash}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => navigate(`/track/${r.product_id}`)}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100">
                          View Product
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleResolve(r.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100">
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Resolved Recalls */}
        {resolved.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" /> Resolved ({resolved.length})
            </h2>
            <div className="space-y-2">
              {resolved.map((r) => (
                <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 opacity-70">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-600 line-through">{r.reason}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Resolved {formatDate(r.resolved_at)} · Issued by {r.issued_by}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Resolved
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && recalls.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 py-20 text-center">
            <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No recalls issued</p>
            <p className="text-gray-400 text-sm mt-1">All products are safe and compliant</p>
          </div>
        )}
      </div>
    </div>
  );
}
