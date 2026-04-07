import { useState, useEffect } from 'react';
import { Sprout, Plus, History, Leaf, Award, Hash, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useContract } from '../../hooks/useContract';
import Register from '../Register';

const ROLE_EVENT_NAMES = ['Registered', 'Harvested', 'Processed', 'Packaged', 'Shipped', 'Received', 'Certified', 'Sold'];

function formatDate(ts) {
  if (!ts || ts === 0) return '—';
  return new Date(Number(ts) * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function FarmerDashboard() {
  const { user } = useAuth();
  const { getAgroChain } = useContract();
  const [tab, setTab] = useState('register');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadProducts = async () => {
    if (!user?.address) return;
    setLoading(true);
    try {
      const contract = getAgroChain();
      const currentBlock = await contract.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 100000);
      const events = await contract.queryFilter(
        contract.filters.ProductRegistered(null, null, user.address),
        fromBlock,
      );
      const details = await Promise.all(
        events.map(async (e) => {
          try {
            const id = Number(e.args.productId);
            const p = await contract.getProduct(id);
            return { id, ...p };
          } catch { return null; }
        })
      );
      setProducts(details.filter(Boolean).reverse());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (tab === 'history') loadProducts(); }, [tab]);

  const tabs = [
    { id: 'register', label: 'Register Product', icon: Plus },
    { id: 'history', label: 'My Products', icon: History },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Sprout className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Farmer Dashboard</h1>
            <p className="text-gray-500 text-sm">Welcome, {user?.name}</p>
          </div>
          <span className="ml-auto px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">FARMER</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === id ? 'bg-green-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {tab === 'register' && <Register />}

        {tab === 'history' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">My Registered Products ({products.length})</h2>
            {loading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
                <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                Loading your products…
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Sprout className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium text-sm">No products yet</p>
                <p className="text-gray-400 text-xs mt-1">Use "Register Product" to add your first product</p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((p) => (
                  <div key={p.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-900">{p.name}</p>
                          {p.isOrganic && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Leaf className="w-3 h-3" />Organic</span>}
                          {p.isCertified && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Award className="w-3 h-3" />Certified</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{p.productType}</p>
                      </div>
                      <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded flex-shrink-0">#{p.id}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{p.batchNumber}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.farmLocation}</span>
                      <span>Harvest: {formatDate(p.harvestDate)}</span>
                      <span>Expiry: {formatDate(p.expiryDate)}</span>
                    </div>
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
