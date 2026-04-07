import { useState, useEffect } from 'react';
import { Award, Search, History, CheckCircle, Loader2, Leaf } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useContract } from '../../hooks/useContract';
import ProductLookup from '../../components/shared/ProductLookup';
import toast from 'react-hot-toast';

export default function CertifierDashboard() {
  const { user } = useAuth();
  const { getAgroChain } = useContract();
  const [tab, setTab] = useState('certify');
  const [selected, setSelected] = useState(null);
  const [certifying, setCertifying] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const loadHistory = async () => {
    if (!user?.address) return;
    setLoading(true);
    try {
      const contract = getAgroChain();
      const currentBlock = await contract.provider.getBlockNumber();
      const events = await contract.queryFilter(
        contract.filters.ProductCertified(null, user.address),
        Math.max(0, currentBlock - 100000),
      );
      const details = await Promise.all(events.map(async (e) => {
        try {
          const productId = Number(e.args.productId);
          const p = await contract.getProduct(productId);
          return { productId, productName: p.name, batchNumber: p.batchNumber };
        } catch { return null; }
      }));
      setHistory(details.filter(Boolean).reverse());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (tab === 'history') loadHistory(); }, [tab]);

  const handleCertify = async () => {
    if (!selected) return;
    if (selected.isCertified) { toast.error('This product is already certified'); return; }
    setCertifying(true);
    try {
      const contract = getAgroChain(true);
      const toastId = toast.loading('Waiting for MetaMask confirmation…');
      const tx = await contract.certifyOrganic(selected.id);
      toast.loading('Certifying on blockchain…', { id: toastId });
      await tx.wait();
      toast.success(`${selected.name} certified as organic!`, { id: toastId });
      setDone(true);
      setSelected(null);
    } catch (err) {
      if (err.code === 4001) toast.error('Transaction rejected in MetaMask.');
      else toast.error(err.message || 'Certification failed');
    } finally {
      setCertifying(false);
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

            {selected && !done && (
              <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6">
                <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" /> Organic Certification
                </h2>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Leaf className="w-4 h-4 text-amber-700" />
                    <p className="font-bold text-amber-800">{selected.name} <span className="font-mono font-normal text-amber-600">#{selected.id}</span></p>
                  </div>
                  <p className="text-xs text-amber-700">{selected.batchNumber} · {selected.farmLocation}</p>
                  {selected.isCertified && (
                    <p className="text-xs font-bold text-green-700 mt-2 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Already certified
                    </p>
                  )}
                  {selected.isOrganic && !selected.isCertified && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <Leaf className="w-3 h-3" /> Registered as organic — pending certification
                    </p>
                  )}
                </div>

                {!selected.isCertified && (
                  <button onClick={handleCertify} disabled={certifying}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-bold rounded-xl transition-colors">
                    {certifying
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Certifying…</>
                      : <><Award className="w-4 h-4" /> Certify as Organic on Blockchain</>}
                  </button>
                )}
              </div>
            )}

            {done && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-bold text-green-800">Product certified successfully!</p>
                  <button onClick={() => setDone(false)} className="text-xs text-green-600 underline mt-0.5">Certify another</button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Products I Certified ({history.length})</h2>
            {loading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-gray-400 text-sm">
                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /> Loading…
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">No certifications yet</div>
            ) : (
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Award className="w-4 h-4 text-amber-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{h.productName}</p>
                      <p className="text-xs text-gray-400 font-mono">#{h.productId} · {h.batchNumber}</p>
                    </div>
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">Certified</span>
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
