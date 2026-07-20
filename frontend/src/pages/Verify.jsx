import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CheckCircle2, Leaf, Award, Shield, Share2, MapPin,
  User, Calendar, Hash, AlertCircle, Loader2, Sprout,
  Truck, Package, Factory, ShoppingCart, ArrowLeft,
  ScanLine, ShieldAlert, Tag, FileText, ShieldOff, Clock,
  ArrowRight, Thermometer,
} from 'lucide-react';
import { useContract } from '../hooks/useContract';
import { logScan } from '../services/api';
import { checkColdChainViolation } from '../utils/coldChain';

// ── Enum maps (must match AgroChain.sol) ─────────────────────────────────────
const EVENT_TYPE_NAMES = [
  'REGISTERED', 'HARVESTED', 'PROCESSED', 'PACKAGED',
  'SHIPPED', 'RECEIVED', 'CERTIFIED', 'SOLD',
];
const ROLE_NAMES = ['NONE', 'FARMER', 'PROCESSOR', 'DISTRIBUTOR', 'RETAILER', 'CERTIFIER'];
const STANDARD_NAMES = ['ORGANIC', 'FAIR_TRADE', 'NON_GMO', 'RAINFOREST_ALLIANCE', 'HACCP', 'ISO22000', 'OTHER'];
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
  try {
    return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return ts; }
}

function formatDateShort(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ts; }
}

const STEP_ICONS = {
  REGISTERED: Shield, HARVESTED: Sprout, PROCESSED: Factory,
  PACKAGED: Package, SHIPPED: Truck, RECEIVED: CheckCircle2,
  CERTIFIED: Award, SOLD: ShoppingCart,
};

const STEP_COLORS = {
  REGISTERED: 'bg-gray-100 text-gray-600',
  HARVESTED:  'bg-green-100 text-green-700',
  PROCESSED:  'bg-blue-100 text-blue-700',
  PACKAGED:   'bg-indigo-100 text-indigo-700',
  SHIPPED:    'bg-amber-100 text-amber-700',
  RECEIVED:   'bg-emerald-100 text-emerald-700',
  CERTIFIED:  'bg-yellow-100 text-yellow-700',
  SOLD:       'bg-purple-100 text-purple-700',
};

async function loadFromChain(contract, productId) {
  const [rawProduct, rawEvents, rawCerts, rawHandoffs] = await Promise.all([
    contract.getProduct(productId),
    contract.getProductEvents(productId),
    contract.getProductCertifications(productId).catch(() => []),
    contract.getProductHandoffs(productId).catch(() => []),
  ]);

  let farmerName = null;
  try {
    const a = await contract.getActor(rawProduct.farmer);
    farmerName = a.name || null;
  } catch {}

  const actorCache = {};
  const getActorInfo = async (addr) => {
    const key = addr.toLowerCase();
    if (actorCache[key]) return actorCache[key];
    try {
      const a = await contract.getActor(addr);
      actorCache[key] = { name: a.name || null, role: ROLE_NAMES[Number(a.role)] || 'NONE' };
    } catch {
      actorCache[key] = { name: null, role: 'NONE' };
    }
    return actorCache[key];
  };

  await Promise.all([
    ...[...new Set(rawEvents.map((e) => (e.actor || e[1]).toLowerCase()))].map(getActorInfo),
    ...[...new Set(rawCerts.map((c) => c.certifier.toLowerCase()))].map(getActorInfo),
    ...[...new Set(rawHandoffs.flatMap((h) => [h.from.toLowerCase(), h.to.toLowerCase()]))].map(getActorInfo),
  ]);

  const certifications = rawCerts.map((c) => ({
    certId: Number(c.certId),
    standard: STANDARD_NAMES[Number(c.standard)] || 'OTHER',
    certNumber: c.certNumber,
    certifierName: actorCache[c.certifier.toLowerCase()]?.name || null,
    notes: c.notes,
    documentUrl: c.documentUrl,
    issuedAt: Number(c.issuedAt),
    expiresAt: Number(c.expiresAt),
    revoked: c.revoked,
  }));

  const handoffs = rawHandoffs.map((h) => ({
    handoffId: Number(h.handoffId),
    fromName: actorCache[h.from.toLowerCase()]?.name || null,
    toName: actorCache[h.to.toLowerCase()]?.name || null,
    carrier: h.carrier,
    trackingNumber: h.trackingNumber,
    originLocation: h.originLocation,
    originTemperature: Number(h.originTemperature),
    originHumidity: Number(h.originHumidity),
    shippedAt: Number(h.shippedAt),
    confirmed: h.confirmed,
    destLocation: h.destLocation,
    destTemperature: Number(h.destTemperature),
    destHumidity: Number(h.destHumidity),
    proofOfDeliveryUrl: h.proofOfDeliveryUrl,
    confirmedAt: Number(h.confirmedAt),
  }));

  const harvestTs = Number(rawProduct.harvestDate) > 0
    ? new Date(Number(rawProduct.harvestDate) * 1000).toISOString() : null;
  const expiryTs = Number(rawProduct.expiryDate) > 0
    ? new Date(Number(rawProduct.expiryDate) * 1000).toISOString() : null;

  const product = {
    id: Number(rawProduct.productId),
    name: rawProduct.name,
    product_type: rawProduct.productType,
    batch_number: rawProduct.batchNumber,
    farmer_name: farmerName,
    farmer_address: rawProduct.farmer,
    farm_location: rawProduct.farmLocation,
    is_organic: rawProduct.isOrganic,
    is_certified: rawProduct.isCertified,
    harvest_date: harvestTs,
    expiry_date: expiryTs,
    description: rawProduct.description,
  };

  const events = rawEvents.map((e, i) => {
    const actorAddr = e.actor || e[1];
    const info = actorCache[actorAddr.toLowerCase()] || { name: null, role: 'NONE' };
    return {
      id: i,
      event_type: EVENT_TYPE_NAMES[Number(e.eventType ?? e[0])] || 'REGISTERED',
      actor_name: info.name,
      actor_role: info.role,
      location: e.location ?? e[2] ?? '',
      notes: e.notes ?? e[3] ?? '',
      temperature: Number(e.temperature ?? e[4] ?? 0) || null,
      humidity: Number(e.humidity ?? e[5] ?? 0) || null,
      timestamp: new Date(Number(e.timestamp ?? e[6]) * 1000).toISOString(),
    };
  });

  return { product, events, certifications, handoffs };
}

export default function Verify() {
  const { productId, unitNumber } = useParams();
  const navigate = useNavigate();
  const { getAgroChain } = useContract();
  const [product, setProduct] = useState(null);
  const [events, setEvents]   = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [handoffs, setHandoffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [unitValid, setUnitValid] = useState(true);
  const [scanStats, setScanStats] = useState(null);

  useEffect(() => {
    if (!productId) { setLoading(false); return; }

    const run = async () => {
      try {
        const contract = getAgroChain();
        let id;

        if (/^\d+$/.test(productId)) {
          id = parseInt(productId);
        } else {
          const idBN = await contract.getProductByBatch(productId);
          id = Number(idBN);
          if (id === 0) throw new Error('Product not found');
        }

        const data = await loadFromChain(contract, id);
        setProduct(data.product);
        setEvents(data.events);
        setCertifications(data.certifications);
        setHandoffs(data.handoffs);

        const unit = unitNumber ? parseInt(unitNumber, 10) : null;
        if (unit) {
          try {
            const issued = Number(await contract.unitCount(id));
            setUnitValid(unit > 0 && unit <= issued);
          } catch { setUnitValid(false); }
        }

        // Fire-and-forget: log the scan for anti-cloning anomaly detection.
        // Never blocks or fails the verification render — the backend
        // scan log is a signal layer on top of the on-chain data, not a
        // source of truth for it.
        logScan(id, unit || undefined).then(setScanStats).catch(() => {});
      } catch (err) {
        setError(err?.reason || err?.message || 'Product not found');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [productId, unitNumber]);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `AgroChain: ${product?.name}`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Verification link copied!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
          <p className="text-green-800 font-semibold">Verifying on blockchain…</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-500 text-sm mb-6">{error || 'This product could not be verified on the blockchain.'}</p>
          <button onClick={() => navigate('/track')}
            className="px-6 py-2.5 bg-green-600 text-white font-semibold text-sm rounded-xl hover:bg-green-700">
            Search Products
          </button>
        </div>
      </div>
    );
  }

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
        {/* Unit mismatch warning */}
        {unitNumber && !unitValid && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800">Unit #{unitNumber} not recognized</p>
              <p className="text-xs text-red-700 mt-0.5">
                This QR code claims to be unit #{unitNumber} of this product, but no such unit has been issued on-chain.
                The underlying product data below is genuine, but this specific label may not be.
              </p>
            </div>
          </div>
        )}

        {/* Suspicious scan-activity warning */}
        {scanStats?.suspicious && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">Unusual scan activity detected</p>
              <p className="text-xs text-amber-700 mt-0.5">
                This code has been scanned {scanStats.scans_24h} times from {scanStats.distinct_scanners_24h} different
                sources in the last 24 hours — more than a single physical item typically sees. It may have been copied
                onto multiple products. If in doubt, verify with the seller.
              </p>
            </div>
          </div>
        )}

        {/* Product Identity */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-green-500 to-emerald-400" />
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-500 text-sm mt-1">{product.product_type}</p>

            <div className="flex flex-wrap gap-2 mt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                <CheckCircle2 className="w-4 h-4" /> Blockchain Verified
              </span>
              {product.is_organic && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800">
                  <Leaf className="w-4 h-4" /> Organic
                </span>
              )}
              {product.is_certified && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                  <Award className="w-4 h-4" /> Certified Organic
                </span>
              )}
              {unitNumber && unitValid && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800">
                  <Tag className="w-4 h-4" /> Unit #{unitNumber}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              {[
                { icon: User,     label: 'Producer',  val: product.farmer_name            },
                { icon: MapPin,   label: 'Origin',    val: product.farm_location          },
                { icon: Calendar, label: 'Harvested', val: formatDate(product.harvest_date) },
                { icon: Hash,     label: 'Batch',     val: product.batch_number, mono: true },
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

        {/* Certifications */}
        {certifications.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">
              Certifications
              <span className="ml-2 text-xs font-medium text-gray-400">{certifications.length} issued</span>
            </h2>
            <div className="space-y-3">
              {certifications.map((c) => {
                const expired = c.expiresAt > 0 && c.expiresAt * 1000 < Date.now();
                return (
                  <div key={c.certId} className={`rounded-xl border p-4 ${c.revoked ? 'border-red-100 bg-red-50/50' : expired ? 'border-gray-100 bg-gray-50' : 'border-amber-100 bg-amber-50/40'}`}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${STANDARD_COLORS[c.standard]}`}>
                          {STANDARD_LABELS[c.standard]}
                        </span>
                        <span className="text-sm font-mono font-semibold text-gray-700">{c.certNumber}</span>
                      </div>
                      {c.revoked ? (
                        <span className="text-xs font-bold text-red-600 bg-white px-2 py-1 rounded-full flex items-center gap-1">
                          <ShieldOff className="w-3 h-3" /> Revoked
                        </span>
                      ) : expired ? (
                        <span className="text-xs font-bold text-gray-500 bg-white px-2 py-1 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Expired
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-green-700 bg-white px-2 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Issued by {c.certifierName || 'a verified certifier'} · {formatDate(c.issuedAt * 1000)}
                      {c.expiresAt > 0 && <> · Expires {formatDate(c.expiresAt * 1000)}</>}
                    </p>
                    {c.revoked && <p className="text-xs text-red-700 mt-1 font-medium">Do not rely on this certification — it was revoked after issuance.</p>}
                    {c.notes && <p className="text-xs text-gray-500 mt-1 italic">"{c.notes}"</p>}
                    {c.documentUrl && !c.revoked && (
                      <a href={`http://${window.location.hostname}:8000${c.documentUrl}`} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 mt-2">
                        <FileText className="w-3.5 h-3.5" /> View certificate document
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Shipment legs */}
        {handoffs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">
              Shipment Chain of Custody
              <span className="ml-2 text-xs font-medium text-gray-400">{handoffs.length} leg{handoffs.length === 1 ? '' : 's'}</span>
            </h2>
            <div className="space-y-3">
              {handoffs.map((h) => {
                const originViolation = checkColdChainViolation(product.product_type, h.originTemperature, h.originHumidity);
                const destViolation = h.confirmed ? checkColdChainViolation(product.product_type, h.destTemperature, h.destHumidity) : null;
                return (
                  <div key={h.handoffId} className={`rounded-xl border p-4 ${(originViolation || destViolation) ? 'border-red-200 bg-red-50/40' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <Truck className="w-4 h-4 text-indigo-500" />
                        {h.fromName || 'Sender'} <ArrowRight className="w-3.5 h-3.5 text-gray-400" /> {h.toName || 'Recipient'}
                      </div>
                      {h.confirmed ? (
                        <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full">Delivered</span>
                      ) : (
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">In Transit</span>
                      )}
                    </div>
                    {(h.carrier || h.trackingNumber) && (
                      <p className="text-xs text-gray-500 mb-3">
                        {h.carrier}{h.carrier && h.trackingNumber && ' · '}
                        {h.trackingNumber && <span className="font-mono">{h.trackingNumber}</span>}
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className={`rounded-lg p-3 ${originViolation ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Origin</p>
                        <p className="text-sm font-bold text-gray-800">{h.originLocation}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Thermometer className="w-3 h-3" />{h.originTemperature}°C · {h.originHumidity}% humidity</p>
                        {originViolation && <p className="text-xs text-red-700 font-semibold mt-1">Cold chain breach</p>}
                      </div>
                      {h.confirmed && (
                        <div className={`rounded-lg p-3 ${destViolation ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Destination</p>
                          <p className="text-sm font-bold text-gray-800">{h.destLocation}</p>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Thermometer className="w-3 h-3" />{h.destTemperature}°C · {h.destHumidity}% humidity</p>
                          {destViolation && <p className="text-xs text-red-700 font-semibold mt-1">Cold chain breach</p>}
                        </div>
                      )}
                    </div>
                    {h.proofOfDeliveryUrl && (
                      <a href={`http://${window.location.hostname}:8000${h.proofOfDeliveryUrl}`} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800 mt-3">
                        <FileText className="w-3.5 h-3.5" /> View proof of delivery
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Journey */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">
            Journey Summary
            <span className="ml-2 text-xs font-medium text-gray-400">
              {events.length} verified checkpoints
            </span>
          </h2>

          <div className="relative">
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gradient-to-b from-green-400 to-gray-200" />
            <div className="space-y-3">
              {events.map((ev, i) => {
                const Icon = STEP_ICONS[ev.event_type] || Shield;
                const colorClass = STEP_COLORS[ev.event_type] || 'bg-gray-100 text-gray-600';
                return (
                  <div key={i} className="relative flex items-start gap-3 pl-1">
                    <div className={`relative z-10 w-8 h-8 rounded-full ${colorClass} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-800">
                          {ev.event_type.charAt(0) + ev.event_type.slice(1).toLowerCase()}
                        </span>
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
              <p className="text-green-300 text-xs font-semibold uppercase tracking-wide mb-1">Farmer Wallet Address</p>
              <p className="font-mono text-xs bg-green-800/50 px-3 py-2 rounded-lg break-all text-green-100">
                {product.farmer_address}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-green-300 text-xs font-semibold uppercase tracking-wide mb-1">Network</p>
                <p className="font-semibold text-sm">AgroChain Blockchain</p>
              </div>
              <div>
                <p className="text-green-300 text-xs font-semibold uppercase tracking-wide mb-1">Product ID</p>
                <p className="font-mono font-bold">#{product.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 bg-green-700/30 rounded-lg px-3 py-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-green-200">
                {events.length} immutable events recorded on-chain
              </span>
            </div>
            {scanStats && (
              <div className="flex items-center gap-2 mt-2 bg-green-700/30 rounded-lg px-3 py-2">
                <ScanLine className="w-3.5 h-3.5 text-green-300 flex-shrink-0" />
                <span className="text-xs font-semibold text-green-200">
                  {scanStats.total_scans} scan{scanStats.total_scans === 1 ? '' : 's'} total
                  {' · '}{scanStats.scans_24h} in the last 24h
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-3">About This Product</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">
          Powered by <span className="font-bold text-green-600">AgroChain</span> · Data immutably stored on blockchain
        </p>
      </div>
    </div>
  );
}
