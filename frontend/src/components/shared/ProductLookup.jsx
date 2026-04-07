import { useState } from 'react';
import { Search, Loader2, Leaf, Award, Package, MapPin, Hash, User } from 'lucide-react';
import { useContract } from '../../hooks/useContract';

function formatDate(ts) {
  if (!ts || ts === 0) return '—';
  return new Date(Number(ts) * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ProductLookup({ onSelect, selectedId }) {
  const { getAgroChain } = useContract();
  const [query, setQuery] = useState('');
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true); setError(''); setProduct(null);
    try {
      const contract = getAgroChain();
      let id;
      if (/^\d+$/.test(q)) {
        id = parseInt(q);
      } else {
        id = Number(await contract.getProductByBatch(q));
      }
      const p = await contract.getProduct(id);
      if (!p.exists) { setError('Product not found'); setLoading(false); return; }
      setProduct({ id, ...p });
    } catch {
      setError('Product not found. Check the ID or batch number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Product ID (e.g. 1) or batch number (e.g. BATCH-2025-123)"
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          />
        </div>
        <button type="submit" disabled={loading || !query.trim()}
          className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold text-sm rounded-xl flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Find
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>
      )}

      {product && (
        <div className={`bg-white border-2 rounded-xl p-4 transition-colors ${selectedId === product.id ? 'border-green-500 bg-green-50' : 'border-gray-100'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-bold text-gray-900">{product.name}</h3>
                {product.isOrganic && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                    <Leaf className="w-3 h-3" /> Organic
                  </span>
                )}
                {product.isCertified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                    <Award className="w-3 h-3" /> Certified
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {[
                  { icon: Package, label: 'Type', val: product.productType },
                  { icon: Hash, label: 'Batch', val: product.batchNumber, mono: true },
                  { icon: MapPin, label: 'Farm', val: product.farmLocation },
                  { icon: User, label: 'Product ID', val: `#${product.id}`, mono: true },
                ].map(({ icon: Icon, label, val, mono }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-400 font-medium flex items-center gap-1"><Icon className="w-3 h-3" />{label}</p>
                    <p className={`text-xs font-semibold text-gray-800 mt-0.5 ${mono ? 'font-mono' : ''}`}>{val || '—'}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Harvest: {formatDate(product.harvestDate)} · Expiry: {formatDate(product.expiryDate)}
              </p>
            </div>
            <button
              onClick={() => onSelect(selectedId === product.id ? null : product)}
              className={`flex-shrink-0 px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                selectedId === product.id
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
              }`}
            >
              {selectedId === product.id ? '✓ Selected' : 'Select'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
