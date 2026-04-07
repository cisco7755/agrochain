import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Search, Leaf, Award, MapPin, User, Calendar, Hash,
  Package, ChevronRight, Loader2, ExternalLink,
  AlertTriangle, Thermometer, FileText, Map,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Timeline from '../components/Timeline';
import ColdChainChart from '../components/ColdChainChart';
import SupplyChainMap from '../components/SupplyChainMap';
import { useContract } from '../hooks/useContract';

// ── Enum maps (must match AgroChain.sol) ─────────────────────────────────────
const EVENT_TYPE_NAMES = [
  'REGISTERED', 'HARVESTED', 'PROCESSED', 'PACKAGED',
  'SHIPPED', 'RECEIVED', 'CERTIFIED', 'SOLD',
];
const ROLE_NAMES = ['NONE', 'FARMER', 'PROCESSOR', 'DISTRIBUTOR', 'RETAILER', 'CERTIFIER'];

const TABS = [
  { id: 'timeline',  label: 'Timeline',   icon: Package },
  { id: 'coldchain', label: 'Cold Chain', icon: Thermometer },
  { id: 'map',       label: 'Map',        icon: Map },
];

function formatDate(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return ts; }
}

function isExpiringSoon(ts) {
  if (!ts) return false;
  const diff = new Date(ts) - new Date();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

function isExpired(ts) {
  if (!ts) return false;
  return new Date(ts) < new Date();
}

// ── Load product + events from blockchain ─────────────────────────────────────
async function loadFromChain(contract, productId) {
  const [rawProduct, rawEvents] = await Promise.all([
    contract.getProduct(productId),
    contract.getProductEvents(productId),
  ]);

  // Resolve farmer name
  let farmerName = null;
  try {
    const farmerActor = await contract.getActor(rawProduct.farmer);
    farmerName = farmerActor.name || null;
  } catch {}

  // Resolve actor names/roles for each event (deduplicated)
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

  await Promise.all([...new Set(rawEvents.map((e) => (e.actor || e[1]).toLowerCase()))].map(getActorInfo));

  const harvestTs = Number(rawProduct.harvestDate) > 0
    ? new Date(Number(rawProduct.harvestDate) * 1000).toISOString()
    : null;
  const expiryTs = Number(rawProduct.expiryDate) > 0
    ? new Date(Number(rawProduct.expiryDate) * 1000).toISOString()
    : null;

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
    const tempRaw = Number(e.temperature ?? e[4] ?? 0);
    const humRaw  = Number(e.humidity  ?? e[5] ?? 0);
    return {
      id: i,
      event_type: EVENT_TYPE_NAMES[Number(e.eventType ?? e[0])] || 'REGISTERED',
      actor_name: info.name,
      actor_role: info.role,
      location: e.location ?? e[2] ?? '',
      notes: e.notes ?? e[3] ?? '',
      // temperature stored as whole degrees (see RecordEventPanel)
      temperature: tempRaw !== 0 ? tempRaw : null,
      humidity: humRaw !== 0 ? humRaw : null,
      timestamp: new Date(Number(e.timestamp ?? e[6]) * 1000).toISOString(),
    };
  });

  return { product, events };
}

export default function Track() {
  const { productId: urlProductId } = useParams();
  const navigate = useNavigate();
  const { getAgroChain } = useContract();

  const [query, setQuery]         = useState('');
  const [product, setProduct]     = useState(null);
  const [events, setEvents]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [activeTab, setActiveTab] = useState('timeline');

  const doLoad = async (idOrBatch) => {
    setLoading(true); setError(''); setProduct(null); setEvents([]);
    try {
      const contract = getAgroChain();
      let productId;

      if (/^\d+$/.test(idOrBatch)) {
        productId = parseInt(idOrBatch);
      } else {
        // batch number lookup
        const idBN = await contract.getProductByBatch(idOrBatch);
        productId = Number(idBN);
        if (productId === 0) throw new Error(`No product found with batch number "${idOrBatch}"`);
        // update URL cleanly
        navigate(`/track/${productId}`, { replace: true });
        return; // useEffect will re-fire with the new URL param
      }

      const data = await loadFromChain(contract, productId);
      setProduct(data.product);
      setEvents(data.events);
    } catch (err) {
      const msg = err?.reason || err?.data?.message || err?.message || 'Product not found';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!urlProductId) return;
    setQuery(urlProductId);
    doLoad(urlProductId);
  }, [urlProductId]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (/^\d+$/.test(q)) navigate(`/track/${q}`);
    else doLoad(q);
  };

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFillColor(22, 163, 74);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('AgroChain Audit Report', 14, 9);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 16);

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text(product?.name || '', 14, 34);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(`${product?.product_type || ''} · ${product?.batch_number || ''}`, 14, 41);

    const infoRows = [
      ['Farmer',       product?.farmer_name || '—'],
      ['Farm Location', product?.farm_location || '—'],
      ['Harvest Date', product?.harvest_date ? new Date(product.harvest_date).toLocaleDateString() : '—'],
      ['Expiry Date',  product?.expiry_date  ? new Date(product.expiry_date).toLocaleDateString()  : '—'],
      ['Organic',      product?.is_organic   ? 'Yes' : 'No'],
      ['Certified',    product?.is_certified ? 'Yes' : 'No'],
    ];
    let y = 52;
    doc.setFontSize(8);
    infoRows.forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(55, 65, 81);
      doc.text(`${label}:`, 14, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128);
      doc.text(String(val), 55, y);
      y += 6;
    });

    y += 4;
    doc.setFillColor(240, 253, 244);
    doc.rect(14, y - 4, pageW - 28, 8, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(22, 101, 52);
    doc.text('Supply Chain Events', 14, y);
    y += 6;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(107, 114, 128);
    ['#', 'Event', 'Actor', 'Location', 'Date', 'Temp', 'Humidity'].forEach((h, i) => {
      doc.text(h, [14, 22, 58, 95, 135, 162, 178][i], y);
    });
    y += 5;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(31, 41, 55);
    events.forEach((ev, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(String(i + 1), 14, y);
      doc.text(ev.event_type.substring(0, 10), 22, y);
      doc.text((ev.actor_name || '—').substring(0, 18), 58, y);
      doc.text((ev.location || '—').substring(0, 18), 95, y);
      doc.text(ev.timestamp ? new Date(ev.timestamp).toLocaleDateString() : '—', 135, y);
      doc.text(ev.temperature != null ? `${ev.temperature}°C` : '—', 162, y);
      doc.text(ev.humidity    != null ? `${ev.humidity}%`     : '—', 178, y);
      y += 6;
      if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(14, y - 5.5, pageW - 28, 6, 'F'); }
    });

    doc.save(`agrochain_audit_${product?.id || 'report'}.pdf`);
    toast.success('PDF exported!');
  };

  const verifyUrl = product ? `http://${window.location.hostname}:5173/verify/${product.id}` : '';
  const expired      = isExpired(product?.expiry_date);
  const expiringSoon = isExpiringSoon(product?.expiry_date);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <span>Home</span><ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-700 font-medium">Track Product</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Track a Product</h1>
          <p className="text-gray-500 text-sm mt-1">Enter a product ID or batch number to retrieve its blockchain history</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Product ID (e.g. 1) or batch number (e.g. BATCH-2024-001)"
              className="w-full pl-11 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold text-sm rounded-xl flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm font-medium mb-6 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="bg-white rounded-xl h-48 border border-gray-100" />
            <div className="bg-white rounded-xl h-96 border border-gray-100" />
          </div>
        )}

        {product && !loading && (
          <div className="space-y-6">
            {/* Expiry alerts */}
            {expired && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-red-700">
                  This product has expired ({formatDate(product.expiry_date)})
                </p>
              </div>
            )}
            {!expired && expiringSoon && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-amber-700">
                  Expiring soon: {formatDate(product.expiry_date)}
                </p>
              </div>
            )}

            {/* Product card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-green-500 to-emerald-400" />
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
                      {product.is_organic && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          <Leaf className="w-3 h-3" /> Organic
                        </span>
                      )}
                      {product.is_certified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <Award className="w-3 h-3" /> Certified
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm mt-1">
                      {product.product_type}{product.description ? ` · ${product.description}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
                  >
                    <FileText className="w-4 h-4" /> Export PDF
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: Hash,     label: 'Batch',     val: product.batch_number,            mono: true },
                    { icon: User,     label: 'Farmer',    val: product.farmer_name               },
                    { icon: MapPin,   label: 'Farm',      val: product.farm_location             },
                    { icon: Calendar, label: 'Harvested', val: formatDate(product.harvest_date)  },
                  ].map(({ icon: Icon, label, val, mono }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
                      </div>
                      <p className={`text-sm font-semibold text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>
                        {val || '—'}
                      </p>
                    </div>
                  ))}
                </div>

                {/* On-chain proof */}
                <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-mono break-all">{product.farmer_address}</span>
                  <span className="ml-auto flex-shrink-0 flex items-center gap-1 text-green-600 font-semibold">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> On-chain
                  </span>
                </div>
              </div>
            </div>

            {/* Tabs + QR */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex border-b border-gray-100">
                    {TABS.map(({ id, label, icon: Icon }) => (
                      <button key={id} onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors ${
                          activeTab === id
                            ? 'text-green-700 border-b-2 border-green-600 bg-green-50/50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}>
                        <Icon className="w-4 h-4" /> {label}
                      </button>
                    ))}
                  </div>
                  <div className="p-6">
                    {activeTab === 'timeline'  && <Timeline events={events} />}
                    {activeTab === 'coldchain' && <ColdChainChart events={events} />}
                    {activeTab === 'map'       && <SupplyChainMap events={events} product={product} />}
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
                  <h3 className="text-sm font-bold text-gray-700 mb-4">Consumer QR Code</h3>
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-white border-2 border-green-200 rounded-xl shadow-inner">
                      <QRCodeSVG value={verifyUrl} size={160} fgColor="#15803d" level="H" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-3 break-all font-mono bg-gray-50 p-2 rounded-lg">
                    {verifyUrl}
                  </p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(verifyUrl); toast.success('URL copied!'); }}
                    className="w-full py-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
                  >
                    Copy Verify URL
                  </button>
                </div>
                <button
                  onClick={() => navigate(`/verify/${product.id}`)}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" /> Open Consumer View
                </button>
              </div>
            </div>
          </div>
        )}

        {!product && !loading && !error && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">Search for a product</h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              Enter a product ID or batch number to retrieve its full blockchain traceability history
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
