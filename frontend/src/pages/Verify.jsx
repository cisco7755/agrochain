import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CheckCircle2, Leaf, Award, Shield, Share2, MapPin,
  User, Calendar, Hash, AlertCircle, Loader2, Sprout,
  Truck, Package, Factory, ShoppingCart, ArrowLeft, AlertTriangle,
} from 'lucide-react';
import { trackProduct, getProductByBatch } from '../services/api';

function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return d; }
}

function formatDateShort(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
}

const STEP_ICONS = {
  REGISTERED: Shield, HARVESTED: Sprout, PROCESSED: Factory,
  PACKAGED: Package, SHIPPED: Truck, RECEIVED: CheckCircle2,
  CERTIFIED: Award, SOLD: ShoppingCart,
};

const STEP_COLORS = {
  REGISTERED: 'bg-gray-100 text-gray-600',
  HARVESTED: 'bg-green-100 text-green-700',
  PROCESSED: 'bg-blue-100 text-blue-700',
  PACKAGED: 'bg-indigo-100 text-indigo-700',
  SHIPPED: 'bg-amber-100 text-amber-700',
  RECEIVED: 'bg-emerald-100 text-emerald-700',
  CERTIFIED: 'bg-yellow-100 text-yellow-700',
  SOLD: 'bg-purple-100 text-purple-700',
};

export default function Verify() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!productId) { setLoading(false); return; }

    const resolve = /^\d+$/.test(productId)
      ? trackProduct(productId)
      : getProductByBatch(productId).then((p) => trackProduct(p.id));

    resolve
      .then(setData)
      .catch((err) => setError(err.message || 'Product not found'))
      .finally(() => setLoading(false));
  }, [productId]);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `AgroChain: ${data?.product?.name}`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Verification link copied!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-agro-light flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
          <p className="text-green-800 font-semibold">Verifying on blockchain…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-500 text-sm mb-6">{error || 'This product could not be verified on the blockchain.'}</p>
          <button onClick={() => navigate('/track')}
            className="px-6 py-2.5 bg-green-600 text-white font-semibold text-sm rounded-xl hover:bg-green-700 transition-colors">
            Search Products
          </button>
        </div>
      </div>
    );
  }

  const { product, events } = data;
  const origin = events?.find((e) => e.event_type === 'HARVESTED' || e.event_type === 'REGISTERED');
  const lastEvent = events?.[events.length - 1];
  const isCertified = product?.is_certified;
  const isOrganic = product?.is_organic;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Verified Banner */}
      <div className="bg-gradient-to-r from-green-700 to-emerald-600 text-white">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-green-200 uppercase tracking-wider">AgroChain Verified</p>
              <p className="text-sm font-bold">Blockchain-authenticated product</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/track')}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-colors">
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Recall Alert */}
        {product?.is_recalled && (
          <div className="bg-red-600 text-white rounded-2xl p-5 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-base uppercase tracking-wide">Product Recalled</p>
              <p className="text-sm text-red-100 mt-1">{data.recall?.reason || product.recall_reason}</p>
              {data.recall && (
                <div className="mt-2 text-xs text-red-200 space-y-0.5">
                  {data.recall.issued_by && <p>Issued by: {data.recall.issued_by}</p>}
                  {data.recall.severity && <p>Severity: <span className="font-bold uppercase">{data.recall.severity}</span></p>}
                  {data.recall.details && <p className="mt-1 text-red-100">{data.recall.details}</p>}
                </div>
              )}
              <p className="text-xs text-red-200 mt-2 font-semibold">Do not consume this product. Contact your retailer for a refund.</p>
            </div>
          </div>
        )}

        {/* Product Identity */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-green-500 to-emerald-400" />
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900">{product?.name}</h1>
            <p className="text-gray-500 text-sm mt-1">{product?.product_type}</p>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                <CheckCircle2 className="w-4 h-4" /> Blockchain Verified
              </span>
              {isOrganic && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800">
                  <Leaf className="w-4 h-4" /> Organic
                </span>
              )}
              {isCertified && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                  <Award className="w-4 h-4" /> Certified Organic
                </span>
              )}
            </div>

            {/* Key Details */}
            <div className="grid grid-cols-2 gap-3 mt-5">
              {[
                { icon: User, label: 'Producer', val: product?.farmer_name },
                { icon: MapPin, label: 'Origin', val: product?.farm_location },
                { icon: Calendar, label: 'Harvested', val: formatDate(product?.harvest_date) },
                { icon: Hash, label: 'Batch', val: product?.batch_number, mono: true },
              ].map(({ icon: Icon, label, val, mono }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
                  </div>
                  <p className={`text-sm font-bold text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>{val || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Journey Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">
            Journey Summary
            <span className="ml-2 text-xs font-medium text-gray-400">
              {events?.length || 0} verified checkpoints
            </span>
          </h2>

          <div className="relative">
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gradient-to-b from-green-400 to-gray-200" />
            <div className="space-y-3">
              {events?.map((ev, i) => {
                const Icon = STEP_ICONS[ev.event_type] || Shield;
                const colorClass = STEP_COLORS[ev.event_type] || 'bg-gray-100 text-gray-600';
                return (
                  <div key={ev.id || i} className="relative flex items-start gap-3 pl-1">
                    <div className={`relative z-10 w-8 h-8 rounded-full ${colorClass} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-800">{ev.event_type.charAt(0) + ev.event_type.slice(1).toLowerCase()}</span>
                        <span className="text-xs text-gray-400">{formatDateShort(ev.timestamp)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {ev.actor_name && <span>{ev.actor_name}</span>}
                        {ev.location && <span> · {ev.location}</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Blockchain Proof */}
        <div className="bg-gradient-to-br from-green-900 to-emerald-800 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-green-300" />
            <h2 className="text-base font-bold">Blockchain Proof</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-green-300 text-xs font-semibold uppercase tracking-wide mb-1">Registration TX Hash</p>
              <p className="font-mono text-xs bg-green-800/50 px-3 py-2 rounded-lg break-all text-green-100">
                {product?.blockchain_tx_hash || '—'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-green-300 text-xs font-semibold uppercase tracking-wide mb-1">Network</p>
                <p className="font-semibold text-sm">Polygon Amoy</p>
              </div>
              <div>
                <p className="text-green-300 text-xs font-semibold uppercase tracking-wide mb-1">Product ID</p>
                <p className="font-mono font-bold">#{product?.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 bg-green-700/30 rounded-lg px-3 py-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-green-200">
                {events?.length || 0} immutable events recorded on-chain
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        {product?.description && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-3">About This Product</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">
          Powered by <span className="font-bold text-green-600">AgroChain</span> · Polygon Amoy Testnet · Data immutably stored on blockchain
        </p>
      </div>
    </div>
  );
}
