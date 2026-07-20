import { useState, useEffect } from 'react';
import {
  Truck, Search, History, CheckCircle, Loader2, PackageCheck,
  Thermometer, AlertTriangle, Upload, ArrowRight, Inbox,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useContract } from '../../hooks/useContract';
import { uploadCertificationDocument } from '../../services/api';
import { checkColdChainViolation, formatColdChainRange } from '../../utils/coldChain';
import ProductLookup from '../../components/shared/ProductLookup';
import toast from 'react-hot-toast';

const ROLE_NAMES = ['NONE', 'FARMER', 'PROCESSOR', 'DISTRIBUTOR', 'RETAILER', 'CERTIFIER'];

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(Number(ts) * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function ColdChainWarning({ productType, temperature, humidity }) {
  const violation = checkColdChainViolation(productType, temperature, humidity);
  if (!violation) return null;
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-red-700"><span className="font-bold">Cold chain violation:</span> {violation}. This will still be recorded on-chain — accuracy matters more than the reading looking good.</p>
    </div>
  );
}

function CheckpointReading({ label, location, temperature, humidity, productType }) {
  const violation = checkColdChainViolation(productType, temperature, humidity);
  return (
    <div className={`rounded-lg p-3 ${violation ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm font-bold text-gray-800">{location || '—'}</p>
      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
        {temperature !== undefined && <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" />{temperature}°C</span>}
        {humidity !== undefined && <span>{humidity}% humidity</span>}
      </div>
      {violation && <p className="text-xs text-red-700 font-semibold mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Breach</p>}
    </div>
  );
}

export default function DistributorDashboard() {
  const { user } = useAuth();
  const { getAgroChain } = useContract();
  const [tab, setTab] = useState('ship');

  const [selected, setSelected] = useState(null);
  const [actors, setActors] = useState([]);
  const [shipForm, setShipForm] = useState({ to: '', carrier: '', trackingNumber: '', location: '', temperature: '', humidity: '', notes: '' });
  const [shipping, setShipping] = useState(false);
  const [shipped, setShipped] = useState(false);

  const [incoming, setIncoming] = useState([]);
  const [loadingIncoming, setLoadingIncoming] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmForm, setConfirmForm] = useState({ location: '', temperature: '', humidity: '', notes: '', file: null });
  const [confirming, setConfirming] = useState(false);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const setShip = (k) => (e) => setShipForm((f) => ({ ...f, [k]: e.target.value }));
  const setConfirm = (k) => (e) => setConfirmForm((f) => ({ ...f, [k]: e.target.value }));

  const loadActors = async () => {
    if (!user?.address) return;
    try {
      const contract = getAgroChain();
      const currentBlock = await contract.provider.getBlockNumber();
      const events = await contract.queryFilter(contract.filters.ActorRegistered(), Math.max(0, currentBlock - 100000));
      const addrs = [...new Set(events.map((e) => e.args.actorAddress))];
      const details = await Promise.all(addrs.map(async (addr) => {
        try {
          const a = await contract.getActor(addr);
          if (!a.isActive || addr.toLowerCase() === user.address.toLowerCase()) return null;
          return { address: addr, name: a.name, role: ROLE_NAMES[Number(a.role)] || 'NONE' };
        } catch { return null; }
      }));
      setActors(details.filter(Boolean));
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadActors(); }, [user?.address]);

  const handleShip = async () => {
    if (!selected) return;
    if (!shipForm.to) { toast.error('Choose a recipient'); return; }
    if (!shipForm.location.trim()) { toast.error('Origin location is required'); return; }
    setShipping(true);
    try {
      const contract = getAgroChain(true);
      const temp = shipForm.temperature !== '' ? Math.round(parseFloat(shipForm.temperature)) : 0;
      const humidity = shipForm.humidity !== '' ? Math.round(parseFloat(shipForm.humidity)) : 0;

      const toastId = toast.loading('Waiting for MetaMask confirmation…');
      const tx = await contract.initiateHandoff(
        selected.id, shipForm.to, shipForm.carrier.trim(), shipForm.trackingNumber.trim(),
        shipForm.location.trim(), temp, humidity, shipForm.notes.trim(),
      );
      toast.loading('Initiating handoff on blockchain…', { id: toastId });
      await tx.wait();
      toast.success('Shipment handoff initiated!', { id: toastId });
      setShipped(true);
      setSelected(null);
      setShipForm({ to: '', carrier: '', trackingNumber: '', location: '', temperature: '', humidity: '', notes: '' });
    } catch (err) {
      if (err.code === 4001) toast.error('Transaction rejected in MetaMask.');
      else toast.error(err.message || 'Failed to initiate handoff');
    } finally {
      setShipping(false);
    }
  };

  const loadIncoming = async () => {
    if (!user?.address) return;
    setLoadingIncoming(true);
    try {
      const contract = getAgroChain();
      const all = await contract.getIncomingHandoffs(user.address);
      const details = await Promise.all(all.filter((h) => !h.confirmed).map(async (h) => {
        try {
          const p = await contract.getProduct(h.productId);
          const fromActor = await contract.getActor(h.from).catch(() => null);
          return { ...parseHandoff(h), productName: p.name, batchNumber: p.batchNumber, productType: p.productType, fromName: fromActor?.name || null };
        } catch { return null; }
      }));
      setIncoming(details.filter(Boolean).reverse());
    } catch (err) { console.error(err); }
    finally { setLoadingIncoming(false); }
  };

  useEffect(() => { if (tab === 'incoming') loadIncoming(); }, [tab]);

  const handleConfirm = async (handoffId) => {
    if (!confirmForm.location.trim()) { toast.error('Destination location is required'); return; }
    setConfirming(true);
    let toastId;
    try {
      let podUrl = '';
      if (confirmForm.file) {
        toastId = toast.loading('Uploading proof of delivery…');
        const res = await uploadCertificationDocument(confirmForm.file);
        podUrl = res.url;
      }
      const temp = confirmForm.temperature !== '' ? Math.round(parseFloat(confirmForm.temperature)) : 0;
      const humidity = confirmForm.humidity !== '' ? Math.round(parseFloat(confirmForm.humidity)) : 0;

      const contract = getAgroChain(true);
      toastId = toast.loading('Waiting for MetaMask confirmation…', { id: toastId });
      const tx = await contract.confirmHandoff(handoffId, confirmForm.location.trim(), temp, humidity, confirmForm.notes.trim(), podUrl);
      toast.loading('Confirming receipt on blockchain…', { id: toastId });
      await tx.wait();
      toast.success('Receipt confirmed!', { id: toastId });
      setConfirmTarget(null);
      setConfirmForm({ location: '', temperature: '', humidity: '', notes: '', file: null });
      loadIncoming();
    } catch (err) {
      if (err.code === 4001) toast.error('Transaction rejected in MetaMask.', { id: toastId });
      else toast.error(err.message || 'Failed to confirm receipt', { id: toastId });
    } finally {
      setConfirming(false);
    }
  };

  const loadHistory = async () => {
    if (!user?.address) return;
    setLoadingHistory(true);
    try {
      const contract = getAgroChain();
      const currentBlock = await contract.provider.getBlockNumber();
      const sentEvents = await contract.queryFilter(
        contract.filters.HandoffInitiated(null, null, user.address),
        Math.max(0, currentBlock - 100000),
      );
      const sentIds = sentEvents.map((e) => Number(e.args.handoffId));
      const received = await contract.getIncomingHandoffs(user.address);

      const all = [
        ...await Promise.all(sentIds.map((id) => contract.handoffs(id))),
        ...received,
      ];
      const details = await Promise.all(all.map(async (h) => {
        try {
          const p = await contract.getProduct(h.productId);
          const direction = h.from.toLowerCase() === user.address.toLowerCase() ? 'sent' : 'received';
          const counterpartAddr = direction === 'sent' ? h.to : h.from;
          const counterpart = await contract.getActor(counterpartAddr).catch(() => null);
          return { ...parseHandoff(h), productName: p.name, batchNumber: p.batchNumber, productType: p.productType, direction, counterpartName: counterpart?.name || null };
        } catch { return null; }
      }));
      setHistory(details.filter(Boolean).sort((a, b) => b.shippedAt - a.shippedAt));
    } catch (err) { console.error(err); }
    finally { setLoadingHistory(false); }
  };

  useEffect(() => { if (tab === 'history') loadHistory(); }, [tab]);

  const tabs = [
    { id: 'ship', label: 'Ship Product', icon: Truck },
    { id: 'incoming', label: 'Incoming Shipments', icon: Inbox, badge: incoming.length || undefined },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Truck className="w-5 h-5 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Distributor Dashboard</h1>
            <p className="text-gray-500 text-sm">Welcome, {user?.name}</p>
          </div>
          <span className="ml-auto px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full">DISTRIBUTOR</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}>
              <Icon className="w-4 h-4" />{label}
              {!!badge && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === id ? 'bg-white/20' : 'bg-indigo-100 text-indigo-700'}`}>{badge}</span>}
            </button>
          ))}
        </div>

        {/* ── Ship ─────────────────────────────────────────────────────── */}
        {tab === 'ship' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-600" /> Find Product to Ship
              </h2>
              <ProductLookup onSelect={setSelected} selectedId={selected?.id} />
            </div>

            {selected && !shipped && (
              <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6">
                <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-600" /> Initiate Shipment Handoff
                </h2>

                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-5 text-sm">
                  <p className="font-bold text-indigo-800">{selected.name} <span className="font-mono font-normal text-indigo-600">#{selected.id}</span></p>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    {selected.batchNumber}
                    {formatColdChainRange(selected.productType) && ` · Safe range: ${formatColdChainRange(selected.productType)}`}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ship To *</label>
                    <select value={shipForm.to} onChange={setShip('to')}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">Select a registered recipient…</option>
                      {actors.map((a) => <option key={a.address} value={a.address}>{a.name} ({a.role})</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Carrier</label>
                      <input value={shipForm.carrier} onChange={setShip('carrier')} placeholder="e.g. DHL, in-house fleet"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tracking Number</label>
                      <input value={shipForm.trackingNumber} onChange={setShip('trackingNumber')} placeholder="e.g. TRK-2026-0091"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Origin Location *</label>
                    <input value={shipForm.location} onChange={setShip('location')} placeholder="e.g. Nairobi Distribution Center"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Temperature (°C)</label>
                      <input type="number" value={shipForm.temperature} onChange={setShip('temperature')} placeholder="e.g. 4"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Humidity (%)</label>
                      <input type="number" min="0" max="100" value={shipForm.humidity} onChange={setShip('humidity')} placeholder="e.g. 65"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>

                  <ColdChainWarning productType={selected.productType} temperature={shipForm.temperature} humidity={shipForm.humidity} />

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
                    <textarea value={shipForm.notes} onChange={setShip('notes')} rows={2}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                  </div>

                  <button onClick={handleShip} disabled={shipping}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl transition-colors">
                    {shipping
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Initiating…</>
                      : <><Truck className="w-4 h-4" /> Initiate Handoff on Blockchain</>}
                  </button>
                </div>
              </div>
            )}

            {shipped && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-bold text-green-800">Handoff initiated — awaiting recipient confirmation.</p>
                  <button onClick={() => setShipped(false)} className="text-xs text-green-600 underline mt-0.5">Ship another</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Incoming ─────────────────────────────────────────────────── */}
        {tab === 'incoming' && (
          <div className="space-y-4">
            {loadingIncoming ? (
              <div className="flex items-center justify-center py-10 gap-2 text-gray-400 text-sm">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> Loading…
              </div>
            ) : incoming.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium text-sm">No shipments awaiting your confirmation</p>
              </div>
            ) : (
              incoming.map((h) => (
                <div key={h.handoffId} className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                    <div>
                      <p className="font-bold text-gray-900">{h.productName} <span className="font-mono font-normal text-gray-400">#{h.productId}</span></p>
                      <p className="text-xs text-gray-500 mt-0.5">{h.batchNumber} · From {h.fromName || h.from.slice(0, 8)}</p>
                      {(h.carrier || h.trackingNumber) && (
                        <p className="text-xs text-gray-400 mt-0.5">{h.carrier}{h.carrier && h.trackingNumber && ' · '}{h.trackingNumber && <span className="font-mono">{h.trackingNumber}</span>}</p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">Awaiting Confirmation</span>
                  </div>

                  <CheckpointReading label="Shipped From" location={h.originLocation} temperature={h.originTemperature} humidity={h.originHumidity} productType={h.productType} />

                  {confirmTarget === h.handoffId ? (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Destination Location *</label>
                        <input value={confirmForm.location} onChange={setConfirm('location')} placeholder="e.g. Mombasa Warehouse"
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="number" value={confirmForm.temperature} onChange={setConfirm('temperature')} placeholder="Temp °C"
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <input type="number" min="0" max="100" value={confirmForm.humidity} onChange={setConfirm('humidity')} placeholder="Humidity %"
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <ColdChainWarning productType={h.productType} temperature={confirmForm.temperature} humidity={confirmForm.humidity} />
                      <textarea value={confirmForm.notes} onChange={setConfirm('notes')} rows={2} placeholder="Condition notes…"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                      <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors">
                        <Upload className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500 truncate">{confirmForm.file ? confirmForm.file.name : 'Attach proof of delivery (optional)…'}</span>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                          onChange={(e) => setConfirmForm((f) => ({ ...f, file: e.target.files?.[0] || null }))} />
                      </label>
                      <div className="flex gap-2">
                        <button onClick={() => handleConfirm(h.handoffId)} disabled={confirming}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-sm">
                          {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />} Confirm Receipt
                        </button>
                        <button onClick={() => setConfirmTarget(null)} className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setConfirmTarget(h.handoffId); setConfirmForm({ location: '', temperature: '', humidity: '', notes: '', file: null }); }}
                      className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-sm transition-colors">
                      <PackageCheck className="w-4 h-4" /> Confirm Receipt
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── History ──────────────────────────────────────────────────── */}
        {tab === 'history' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Shipment History ({history.length})</h2>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-10 gap-2 text-gray-400 text-sm">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> Loading…
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">No shipments yet</div>
            ) : (
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h.handoffId} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${h.direction === 'sent' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {h.direction === 'sent' ? 'Sent' : 'Received'}
                        </span>
                        <p className="text-sm font-bold text-gray-800">{h.productName} <span className="font-mono font-normal text-gray-400 text-xs">#{h.productId}</span></p>
                      </div>
                      {h.confirmed ? (
                        <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Delivered</span>
                      ) : (
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">In Transit</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      {h.direction === 'sent' ? 'To' : 'From'} {h.counterpartName || 'a registered actor'}
                      {h.carrier && ` · ${h.carrier}`}{h.trackingNumber && <span className="font-mono"> · {h.trackingNumber}</span>}
                      {' · '}{formatDate(h.shippedAt)}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <CheckpointReading label="Origin" location={h.originLocation} temperature={h.originTemperature} humidity={h.originHumidity} productType={h.productType} />
                      {h.confirmed && (
                        <CheckpointReading label="Destination" location={h.destLocation} temperature={h.destTemperature} humidity={h.destHumidity} productType={h.productType} />
                      )}
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

function parseHandoff(h) {
  return {
    handoffId: Number(h.handoffId),
    productId: Number(h.productId),
    from: h.from,
    to: h.to,
    carrier: h.carrier,
    trackingNumber: h.trackingNumber,
    originLocation: h.originLocation,
    originTemperature: Number(h.originTemperature),
    originHumidity: Number(h.originHumidity),
    shipNotes: h.shipNotes,
    shippedAt: Number(h.shippedAt),
    confirmed: h.confirmed,
    destLocation: h.destLocation,
    destTemperature: Number(h.destTemperature),
    destHumidity: Number(h.destHumidity),
    receiveNotes: h.receiveNotes,
    proofOfDeliveryUrl: h.proofOfDeliveryUrl,
    confirmedAt: Number(h.confirmedAt),
  };
}
