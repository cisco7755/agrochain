import { useState, useEffect } from 'react';
import { ShoppingBag, Search, History, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useContract } from '../../hooks/useContract';
import ProductLookup from '../../components/shared/ProductLookup';
import RecordEventPanel from '../../components/shared/RecordEventPanel';

const EVENT_OPTIONS = [{ label: 'Sold', value: 7 }];
const EVENT_NAMES = ['Registered', 'Harvested', 'Processed', 'Packaged', 'Shipped', 'Received', 'Certified', 'Sold'];

export default function RetailerDashboard() {
  const { user } = useAuth();
  const { getAgroChain } = useContract();
  const [tab, setTab] = useState('record');
  const [selected, setSelected] = useState(null);
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
        contract.filters.EventRecorded(null, user.address),
        Math.max(0, currentBlock - 100000),
      );
      const details = await Promise.all(events.map(async (e) => {
        try {
          const productId = Number(e.args.productId);
          const p = await contract.getProduct(productId);
          return { productId, productName: p.name, eventType: Number(e.args.eventType), timestamp: Number(e.args.timestamp) };
        } catch { return null; }
      }));
      setHistory(details.filter(Boolean).reverse());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (tab === 'history') loadHistory(); }, [tab]);

  const tabs = [
    { id: 'record', label: 'Record Sale', icon: ShoppingBag },
    { id: 'history', label: 'My Sales', icon: History },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-pink-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Retailer Dashboard</h1>
            <p className="text-gray-500 text-sm">Welcome, {user?.name}</p>
          </div>
          <span className="ml-auto px-3 py-1 bg-pink-100 text-pink-800 text-xs font-bold rounded-full">RETAILER</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === id ? 'bg-pink-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {tab === 'record' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-pink-600" /> Find Product to Record Sale
              </h2>
              <ProductLookup onSelect={setSelected} selectedId={selected?.id} />
            </div>

            {selected && !done && (
              <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-6">
                <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-pink-600" /> Record Sale Event
                </h2>
                <RecordEventPanel
                  product={selected}
                  eventOptions={EVENT_OPTIONS}
                  onSuccess={() => { setDone(true); setSelected(null); }}
                />
              </div>
            )}

            {done && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-bold text-green-800">Sale recorded on blockchain!</p>
                  <button onClick={() => setDone(false)} className="text-xs text-green-600 underline mt-0.5">Record another</button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">My Sales ({history.length})</h2>
            {loading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-gray-400 text-sm">
                <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" /> Loading…
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">No sales recorded yet</div>
            ) : (
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{h.productName} <span className="text-gray-400 font-normal font-mono">#{h.productId}</span></p>
                      <p className="text-xs text-gray-500 mt-0.5">{EVENT_NAMES[h.eventType]}</p>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(h.timestamp * 1000).toLocaleDateString()}</span>
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
