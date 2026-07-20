import { useState, useEffect } from 'react';
import {
  Award, Search, History, CheckCircle, Loader2, Leaf,
  FileText, Upload, XCircle, Clock, ShieldOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useContract } from '../../hooks/useContract';
import { uploadCertificationDocument } from '../../services/api';
import ProductLookup from '../../components/shared/ProductLookup';
import toast from 'react-hot-toast';

const STANDARDS = ['ORGANIC', 'FAIR_TRADE', 'NON_GMO', 'RAINFOREST_ALLIANCE', 'HACCP', 'ISO22000', 'OTHER'];
const STANDARD_LABELS = {
  ORGANIC: 'Organic', FAIR_TRADE: 'Fair Trade', NON_GMO: 'Non-GMO',
  RAINFOREST_ALLIANCE: 'Rainforest Alliance', HACCP: 'HACCP', ISO22000: 'ISO 22000', OTHER: 'Other',
};
const STANDARD_COLORS = {
  ORGANIC: 'bg-green-100 text-green-700', FAIR_TRADE: 'bg-pink-100 text-pink-700',
  NON_GMO: 'bg-blue-100 text-blue-700', RAINFOREST_ALLIANCE: 'bg-emerald-100 text-emerald-700',
  HACCP: 'bg-indigo-100 text-indigo-700', ISO22000: 'bg-purple-100 text-purple-700', OTHER: 'bg-gray-100 text-gray-700',
};

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(Number(ts) * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function isExpired(expiresAt) {
  const ts = Number(expiresAt);
  return ts > 0 && ts * 1000 < Date.now();
}

export default function CertifierDashboard() {
  const { user } = useAuth();
  const { getAgroChain } = useContract();
  const [tab, setTab] = useState('certify');
  const [selected, setSelected] = useState(null);
  const [productCerts, setProductCerts] = useState([]);
  const [issuing, setIssuing] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState(null);

  const [form, setForm] = useState({
    standard: 'ORGANIC', certNumber: '', notes: '', expiry: '', file: null,
  });
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const loadProductCerts = async (productId) => {
    try {
      const contract = getAgroChain();
      const certs = await contract.getProductCertifications(productId);
      setProductCerts(certs.map((c) => ({
        certId: Number(c.certId), standard: STANDARDS[Number(c.standard)],
        certNumber: c.certNumber, certifier: c.certifier, notes: c.notes,
        documentUrl: c.documentUrl, issuedAt: Number(c.issuedAt),
        expiresAt: Number(c.expiresAt), revoked: c.revoked,
      })));
    } catch { setProductCerts([]); }
  };

  useEffect(() => {
    if (selected) loadProductCerts(selected.id);
    else setProductCerts([]);
  }, [selected?.id]);

  const loadHistory = async () => {
    if (!user?.address) return;
    setLoading(true);
    try {
      const contract = getAgroChain();
      const currentBlock = await contract.provider.getBlockNumber();
      const events = await contract.queryFilter(
        contract.filters.CertificationIssued(null, null, user.address),
        Math.max(0, currentBlock - 100000),
      );
      const details = await Promise.all(events.map(async (e) => {
        try {
          const certId = Number(e.args.certId);
          const productId = Number(e.args.productId);
          const cert = await contract.certifications(certId);
          const p = await contract.getProduct(productId);
          return {
            certId, productId, productName: p.name, batchNumber: p.batchNumber,
            standard: STANDARDS[Number(cert.standard)], certNumber: cert.certNumber,
            expiresAt: Number(cert.expiresAt), revoked: cert.revoked,
          };
        } catch { return null; }
      }));
      setHistory(details.filter(Boolean).reverse());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (tab === 'history') loadHistory(); }, [tab]);

  const resetForm = () => setForm({ standard: 'ORGANIC', certNumber: '', notes: '', expiry: '', file: null });

  const handleIssue = async () => {
    if (!selected) return;
    if (!form.certNumber.trim()) { toast.error('Certificate number is required'); return; }
    setIssuing(true);
    let toastId;
    try {
      let documentUrl = '';
      if (form.file) {
        toastId = toast.loading('Uploading certificate document…');
        const res = await uploadCertificationDocument(form.file);
        documentUrl = res.url;
      }

      const expiresAt = form.expiry ? Math.floor(new Date(form.expiry).getTime() / 1000) : 0;
      const contract = getAgroChain(true);
      toastId = toast.loading('Waiting for MetaMask confirmation…', { id: toastId });
      const tx = await contract.issueCertification(
        selected.id,
        STANDARDS.indexOf(form.standard),
        form.certNumber.trim(),
        form.notes.trim(),
        documentUrl,
        expiresAt,
      );
      toast.loading('Issuing certification on blockchain…', { id: toastId });
      await tx.wait();
      toast.success(`${STANDARD_LABELS[form.standard]} certification issued!`, { id: toastId });
      resetForm();
      loadProductCerts(selected.id);
    } catch (err) {
      if (err.code === 4001) toast.error('Transaction rejected in MetaMask.', { id: toastId });
      else toast.error(err.message || 'Certification failed', { id: toastId });
    } finally {
      setIssuing(false);
    }
  };

  const handleRevoke = async (certId) => {
    const reason = window.prompt('Reason for revoking this certification:');
    if (!reason || !reason.trim()) return;
    setRevokingId(certId);
    try {
      const contract = getAgroChain(true);
      const toastId = toast.loading('Waiting for MetaMask confirmation…');
      const tx = await contract.revokeCertification(certId, reason.trim());
      toast.loading('Revoking on blockchain…', { id: toastId });
      await tx.wait();
      toast.success('Certification revoked', { id: toastId });
      if (selected) loadProductCerts(selected.id);
      if (tab === 'history') loadHistory();
    } catch (err) {
      if (err.code === 4001) toast.error('Transaction rejected in MetaMask.');
      else toast.error(err.message || 'Revoke failed');
    } finally {
      setRevokingId(null);
    }
  };

  const tabs = [
    { id: 'certify', label: 'Certify Product', icon: Award },
    { id: 'history', label: 'Certified Products', icon: History },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Award className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Certifier Dashboard</h1>
            <p className="text-gray-500 text-sm">Welcome, {user?.name}</p>
          </div>
          <span className="ml-auto px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">CERTIFIER</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === id ? 'bg-amber-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {tab === 'certify' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-600" /> Find Product to Certify
              </h2>
              <ProductLookup onSelect={setSelected} selectedId={selected?.id} />
            </div>

            {selected && (
              <>
                {/* Existing certifications on this product */}
                {productCerts.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-base font-bold text-gray-900 mb-4">
                      Existing Certifications ({productCerts.length})
                    </h2>
                    <div className="space-y-2">
                      {productCerts.map((c) => {
                        const expired = isExpired(c.expiresAt);
                        return (
                          <div key={c.certId} className="flex items-start justify-between gap-3 py-3 border-b border-gray-50 last:border-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STANDARD_COLORS[c.standard]}`}>
                                  {STANDARD_LABELS[c.standard]}
                                </span>
                                <span className="text-sm font-mono font-semibold text-gray-700">{c.certNumber}</span>
                                {c.revoked && (
                                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <ShieldOff className="w-3 h-3" /> Revoked
                                  </span>
                                )}
                                {!c.revoked && expired && (
                                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Expired
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Issued {formatDate(c.issuedAt)}
                                {c.expiresAt > 0 && ` · Expires ${formatDate(c.expiresAt)}`}
                                {c.documentUrl && (
                                  <> · <a href={`http://${window.location.hostname}:8000${c.documentUrl}`} target="_blank" rel="noreferrer" className="text-amber-600 underline">Document</a></>
                                )}
                              </p>
                              {c.notes && <p className="text-xs text-gray-400 mt-0.5 italic">"{c.notes}"</p>}
                            </div>
                            {!c.revoked && c.certifier.toLowerCase() === user?.address?.toLowerCase() && (
                              <button
                                onClick={() => handleRevoke(c.certId)}
                                disabled={revokingId === c.certId}
                                className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50 flex-shrink-0"
                              >
                                {revokingId === c.certId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                Revoke
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Issue new certification */}
                <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6">
                  <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-600" /> Issue New Certification
                  </h2>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                    <div className="flex items-center gap-2 mb-1">
                      <Leaf className="w-4 h-4 text-amber-700" />
                      <p className="font-bold text-amber-800">{selected.name} <span className="font-mono font-normal text-amber-600">#{selected.id}</span></p>
                    </div>
                    <p className="text-xs text-amber-700">{selected.batchNumber} · {selected.farmLocation}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Standard</label>
                        <select value={form.standard} onChange={set('standard')}
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                          {STANDARDS.map((s) => <option key={s} value={s}>{STANDARD_LABELS[s]}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Certificate Number *</label>
                        <input value={form.certNumber} onChange={set('certNumber')} placeholder="e.g. USDA-ORG-2026-0143"
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Expiry Date (optional)</label>
                      <input type="date" value={form.expiry} onChange={set('expiry')}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Inspector Notes</label>
                      <textarea value={form.notes} onChange={set('notes')} rows={3}
                        placeholder="Findings from inspection…"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Supporting Document (PDF/image)</label>
                      <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-amber-300 hover:bg-amber-50/50 transition-colors">
                        <Upload className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500 truncate">
                          {form.file ? form.file.name : 'Attach inspection report or lab result…'}
                        </span>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                          onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] || null }))} />
                      </label>
                    </div>

                    <button onClick={handleIssue} disabled={issuing}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-bold rounded-xl transition-colors">
                      {issuing
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Issuing…</>
                        : <><FileText className="w-4 h-4" /> Issue Certification on Blockchain</>}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Certifications I Issued ({history.length})</h2>
            {loading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-gray-400 text-sm">
                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /> Loading…
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">No certifications yet</div>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.certId} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Award className="w-4 h-4 text-amber-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800">{h.productName}</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STANDARD_COLORS[h.standard]}`}>
                          {STANDARD_LABELS[h.standard]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-mono">#{h.productId} · {h.batchNumber} · {h.certNumber}</p>
                    </div>
                    {h.revoked ? (
                      <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full flex items-center gap-1">
                        <ShieldOff className="w-3 h-3" /> Revoked
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
