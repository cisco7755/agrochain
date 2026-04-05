import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Search, Leaf, Award, MapPin, User, Calendar, Hash,
  Package, ChevronRight, Plus, X, Loader2, ExternalLink,
  AlertTriangle, Thermometer, Download, Upload, Map, FileText,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Timeline from '../components/Timeline';
import ColdChainChart from '../components/ColdChainChart';
import SupplyChainMap from '../components/SupplyChainMap';
import {
  trackProduct, getProductByBatch, createEvent,
  uploadProductImage, uploadCertificate, exportProductAuditCSV,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const EVENT_TYPES = ['HARVESTED', 'PROCESSED', 'PACKAGED', 'SHIPPED', 'RECEIVED', 'CERTIFIED', 'SOLD'];
const ACTOR_ROLES = ['FARMER', 'PROCESSOR', 'DISTRIBUTOR', 'RETAILER', 'CERTIFIER'];

const TABS = [
  { id: 'timeline', label: 'Timeline', icon: Package },
  { id: 'coldchain', label: 'Cold Chain', icon: Thermometer },
  { id: 'map', label: 'Map', icon: Map },
];

function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return d; }
}

function isExpiringSoon(dateStr) {
  if (!dateStr) return false;
  const diff = new Date(dateStr) - new Date();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

function isExpired(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function EventModal({ productId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    product_id: productId, event_type: 'SHIPPED', actor_name: '',
    actor_role: 'DISTRIBUTOR', location: '', location_lat: '', location_lng: '',
    temperature: '', humidity: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (f) => (e) => setForm((v) => ({ ...v, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.actor_name || !form.location) { toast.error('Actor name and location required'); return; }
    setSubmitting(true);
    try {
      await createEvent({
        ...form,
        temperature: form.temperature !== '' ? parseFloat(form.temperature) : null,
        humidity: form.humidity !== '' ? parseFloat(form.humidity) : null,
        location_lat: form.location_lat !== '' ? parseFloat(form.location_lat) : null,
        location_lng: form.location_lng !== '' ? parseFloat(form.location_lng) : null,
      });
      toast.success('Event recorded on blockchain!');
      onSuccess(); onClose();
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-base font-bold text-gray-900">Add Supply Chain Event</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Event Type *</label>
              <select value={form.event_type} onChange={set('event_type')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Actor Role *</label>
              <select value={form.actor_role} onChange={set('actor_role')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                {ACTOR_ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Actor Name *</label>
            <input value={form.actor_name} onChange={set('actor_name')} placeholder="e.g. FreshLogistics Ltd" required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Location *</label>
            <input value={form.location} onChange={set('location')} placeholder="e.g. Mombasa, Kenya" required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Latitude</label>
              <input type="number" step="any" value={form.location_lat} onChange={set('location_lat')} placeholder="-1.2921"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Longitude</label>
              <input type="number" step="any" value={form.location_lng} onChange={set('location_lng')} placeholder="36.8219"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Temperature (°C)</label>
              <input type="number" step="0.1" value={form.temperature} onChange={set('temperature')} placeholder="e.g. 4.5"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Humidity (%)</label>
              <input type="number" min="0" max="100" value={form.humidity} onChange={set('humidity')} placeholder="e.g. 65"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Additional details…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-xl flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording…</> : 'Record Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Track() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('timeline');
  const imageInputRef = useRef();
  const certInputRef = useRef();

  const load = async (id) => {
    setLoading(true); setError('');
    try { setData(await trackProduct(id)); }
    catch (err) { setError(err.message || 'Product not found'); setData(null); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!productId) return;
    if (/^\d+$/.test(productId)) { setQuery(productId); load(productId); }
    else {
      setQuery(productId); setLoading(true); setError('');
      getProductByBatch(productId)
        .then((p) => navigate(`/track/${p.id}`, { replace: true }))
        .catch((err) => { setError(err.message || 'Product not found'); setLoading(false); });
    }
  }, [productId]);

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = query.trim(); if (!q) return;
    setLoading(true); setError('');
    try {
      if (/^\d+$/.test(q)) navigate(`/track/${q}`);
      else { const p = await getProductByBatch(q); navigate(`/track/${p.id}`); }
    } catch (err) { setError(err.message || 'Product not found'); setLoading(false); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      await uploadProductImage(data.product.id, file);
      toast.success('Image uploaded!'); load(data.product.id);
    } catch (err) { toast.error(err.message); }
  };

  const handleCertUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      await uploadCertificate(data.product.id, file);
      toast.success('Certificate uploaded!'); load(data.product.id);
    } catch (err) { toast.error(err.message); }
  };

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const product = data?.product;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // Header bar
    doc.setFillColor(22, 163, 74);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('AgroChain Audit Report', 14, 9);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 16);

    // Product info
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text(product?.name || '', 14, 34);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(`${product?.product_type || ''} · ${product?.batch_number || ''}`, 14, 41);

    // Info grid
    const infoRows = [
      ['Farmer', product?.farmer_name], ['Farm Location', product?.farm_location],
      ['Harvest Date', product?.harvest_date ? new Date(product.harvest_date).toLocaleDateString() : '—'],
      ['Expiry Date', product?.expiry_date ? new Date(product.expiry_date).toLocaleDateString() : '—'],
      ['Organic', product?.is_organic ? 'Yes' : 'No'], ['Certified', product?.is_certified ? 'Yes' : 'No'],
      ['Recalled', product?.is_recalled ? 'YES' : 'No'],
      ['Blockchain TX', product?.blockchain_tx_hash || '—'],
    ];
    let y = 52;
    doc.setFontSize(8);
    infoRows.forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(55, 65, 81);
      doc.text(`${label}:`, 14, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128);
      doc.text(String(val || '—'), 55, y);
      y += 6;
    });

    // Events table header
    y += 4;
    doc.setFillColor(240, 253, 244);
    doc.rect(14, y - 4, pageW - 28, 8, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(22, 101, 52);
    doc.text('Supply Chain Events', 14, y);
    y += 6;

    const events = data?.events || [];
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(107, 114, 128);
    ['#', 'Event', 'Actor', 'Location', 'Date', 'Temp', 'Humidity'].forEach((h, i) => {
      doc.text(h, [14, 22, 58, 95, 135, 162, 178][i], y);
    });
    y += 5;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(31, 41, 55);
    events.forEach((ev, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(String(i + 1), 14, y);
      doc.text((ev.event_type || '').substring(0, 10), 22, y);
      doc.text((ev.actor_name || '—').substring(0, 18), 58, y);
      doc.text((ev.location || '—').substring(0, 18), 95, y);
      doc.text(ev.timestamp ? new Date(ev.timestamp).toLocaleDateString() : '—', 135, y);
      doc.text(ev.temperature != null ? `${ev.temperature}°C` : '—', 162, y);
      doc.text(ev.humidity != null ? `${ev.humidity}%` : '—', 178, y);
      y += 6;
      if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(14, y - 5.5, pageW - 28, 6, 'F'); }
    });

    doc.save(`agrochain_audit_${product?.id || 'report'}.pdf`);
    toast.success('PDF exported!');
  };

  const handleExportCSV = async () => {
    try {
      const blob = await exportProductAuditCSV(data.product.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `agrochain_audit_${data.product.id}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(err.message); }
  };

  const { user, isAuthenticated } = useAuth();
  const canAddEvent = isAuthenticated;
  const canUploadImage = isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'FARMER');
  const canUploadCert = isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'CERTIFIER');

  const verifyUrl = data ? `http://${window.location.hostname}:5173/verify/${data.product?.id}` : '';
  const product = data?.product;
  const expired = isExpired(product?.expiry_date);
  const expiringSoon = isExpiringSoon(product?.expiry_date);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
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
        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Product ID (e.g. 1) or batch number (e.g. BATCH-2024-001)"
              className="w-full pl-11 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <button type="submit" disabled={loading || !query.trim()}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold text-sm rounded-xl flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
          </button>
        </form>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm font-medium mb-6">{error}</div>}

        {loading && !data && (
          <div className="space-y-4 animate-pulse">
            <div className="bg-white rounded-xl h-48 border border-gray-100" />
            <div className="bg-white rounded-xl h-96 border border-gray-100" />
          </div>
        )}

        {data && !loading && (
          <div className="space-y-6">
            {/* Recall alert */}
            {product?.is_recalled && (
              <div className="bg-red-600 text-white rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">PRODUCT RECALLED</p>
                  <p className="text-sm text-red-100 mt-0.5">{data.recall?.reason || product.recall_reason}</p>
                  {data.recall?.issued_by && <p className="text-xs text-red-200 mt-1">Issued by: {data.recall.issued_by} · {data.recall?.severity} severity</p>}
                </div>
              </div>
            )}

            {/* Expiry alert */}
            {!product?.is_recalled && expired && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-red-700">This product has expired ({formatDate(product.expiry_date)})</p>
              </div>
            )}
            {!product?.is_recalled && expiringSoon && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-amber-700">Expiring soon: {formatDate(product.expiry_date)}</p>
              </div>
            )}

            {/* Product card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className={`h-1.5 bg-gradient-to-r ${product?.is_recalled ? 'from-red-500 to-red-400' : 'from-green-500 to-emerald-400'}`} />
              <div className="p-6">
                <div className="flex gap-4 flex-wrap">
                  {/* Product image */}
                  {product?.image_url && (
                    <img src={`http://${window.location.hostname}:8000${product.image_url}`}
                      alt={product.name} className="w-24 h-24 rounded-xl object-cover border border-gray-100 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-gray-900">{product?.name}</h2>
                          {product?.is_organic && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800"><Leaf className="w-3 h-3" /> Organic</span>}
                          {product?.is_certified && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><Award className="w-3 h-3" /> Certified</span>}
                          {product?.is_recalled && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3" /> Recalled</span>}
                        </div>
                        <p className="text-gray-500 text-sm mt-1">{product?.product_type} · {product?.description}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap flex-shrink-0">
                        {canAddEvent && (
                          <button onClick={() => setShowModal(true)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg">
                            <Plus className="w-4 h-4" /> Event
                          </button>
                        )}
                        <button onClick={handleExportCSV}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">
                          <Download className="w-4 h-4" /> CSV
                        </button>
                        <button onClick={handleExportPDF}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg">
                          <FileText className="w-4 h-4" /> PDF
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                      {[
                        { icon: Hash, label: 'Batch', val: product?.batch_number, mono: true },
                        { icon: User, label: 'Farmer', val: product?.farmer_name },
                        { icon: MapPin, label: 'Farm', val: product?.farm_location },
                        { icon: Calendar, label: 'Harvested', val: formatDate(product?.harvest_date) },
                      ].map(({ icon: Icon, label, val, mono }) => (
                        <div key={label} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
                          </div>
                          <p className={`text-sm font-semibold text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>{val || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Uploads */}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-50">
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <input ref={certInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleCertUpload} />
                  {canUploadImage && (
                    <button onClick={() => imageInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100">
                      <Upload className="w-3.5 h-3.5" /> Upload Image
                    </button>
                  )}
                  {canUploadCert && (
                    <button onClick={() => certInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100">
                      <Upload className="w-3.5 h-3.5" /> Upload Certificate
                    </button>
                  )}
                  {product?.certificate_url && (
                    <a href={`http://${window.location.hostname}:8000${product.certificate_url}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100">
                      <Award className="w-3.5 h-3.5" /> View Certificate
                    </a>
                  )}
                </div>

                {product?.blockchain_tx_hash && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                    <Hash className="w-3.5 h-3.5" />
                    <span className="font-mono break-all">{product.blockchain_tx_hash}</span>
                    <span className="ml-auto flex-shrink-0 flex items-center gap-1 text-green-600 font-medium">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> On-chain
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs + QR */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex border-b border-gray-100">
                    {TABS.map(({ id, label, icon: Icon }) => (
                      <button key={id} onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors ${activeTab === id ? 'text-green-700 border-b-2 border-green-600 bg-green-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                        <Icon className="w-4 h-4" /> {label}
                      </button>
                    ))}
                  </div>
                  <div className="p-6">
                    {activeTab === 'timeline' && <Timeline events={data.events || []} />}
                    {activeTab === 'coldchain' && <ColdChainChart events={data.events || []} />}
                    {activeTab === 'map' && <SupplyChainMap events={data.events || []} product={product} />}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
                  <h3 className="text-sm font-bold text-gray-700 mb-4">Consumer QR Code</h3>
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-white border-2 border-green-200 rounded-xl shadow-inner">
                      {data.qr_code_url
                        ? <img src={data.qr_code_url} alt="QR Code" width={160} height={160} />
                        : <QRCodeSVG value={verifyUrl} size={160} fgColor="#15803d" level="H" />
                      }
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-3 break-all font-mono bg-gray-50 p-2 rounded-lg">{verifyUrl}</p>
                  <button onClick={() => { navigator.clipboard.writeText(verifyUrl); toast.success('URL copied!'); }}
                    className="w-full py-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100">
                    Copy Verify URL
                  </button>
                </div>
                <button onClick={() => navigate(`/verify/${product?.id}`)}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm">
                  <ExternalLink className="w-4 h-4" /> Open Consumer View
                </button>
              </div>
            </div>
          </div>
        )}

        {!data && !loading && !error && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">Search for a product</h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">Enter a product ID or batch number to retrieve its full blockchain traceability history</p>
          </div>
        )}
      </div>

      {showModal && (
        <EventModal productId={data?.product?.id} onClose={() => setShowModal(false)} onSuccess={() => load(data?.product?.id)} />
      )}
    </div>
  );
}
