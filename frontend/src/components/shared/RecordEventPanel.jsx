import { useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useContract } from '../../hooks/useContract';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// eventOptions: [{ label, value (uint8) }]
export default function RecordEventPanel({ product, eventOptions, onSuccess }) {
  const { getAgroChain } = useContract();
  const { user } = useAuth();
  const [form, setForm] = useState({
    eventType: eventOptions[0]?.value ?? 2,
    location: user?.address ? '' : '',
    notes: '',
    temperature: '',
    humidity: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.location) { toast.error('Location is required'); return; }
    setSubmitting(true);
    try {
      const contract = getAgroChain(true);
      const temp = form.temperature !== '' ? Math.round(parseFloat(form.temperature)) : 0;
      const humidity = form.humidity !== '' ? Math.round(parseFloat(form.humidity)) : 0;

      const toastId = toast.loading('Waiting for MetaMask confirmation…');
      const tx = await contract.recordEvent(
        product.id,
        parseInt(form.eventType),
        form.location.trim(),
        form.notes.trim(),
        temp,
        humidity,
      );
      toast.loading('Recording on blockchain…', { id: toastId });
      await tx.wait();
      toast.success('Event recorded on blockchain!', { id: toastId });
      setForm({ eventType: eventOptions[0]?.value ?? 2, location: '', notes: '', temperature: '', humidity: '' });
      onSuccess?.();
    } catch (err) {
      if (err.code === 4001) toast.error('Transaction rejected in MetaMask.');
      else toast.error(err.message || 'Failed to record event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Selected product summary */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm">
        <p className="font-bold text-green-800">{product.name} <span className="font-mono font-normal text-green-600">#{product.id}</span></p>
        <p className="text-green-700 text-xs mt-0.5">{product.batchNumber} · {product.farmLocation}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Event Type *</label>
          <select value={form.eventType} onChange={set('eventType')}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500">
            {eventOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Location *</label>
          <input value={form.location} onChange={set('location')} required
            placeholder="e.g. Lagos, Nigeria"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Temperature (°C)</label>
          <input type="number" step="1" value={form.temperature} onChange={set('temperature')}
            placeholder="e.g. 4"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Humidity (%)</label>
          <input type="number" min="0" max="100" value={form.humidity} onChange={set('humidity')}
            placeholder="e.g. 65"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
          <textarea value={form.notes} onChange={set('notes')} rows={2}
            placeholder="Any additional details about this event…"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
        </div>
      </div>

      <button type="submit" disabled={submitting}
        className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold rounded-xl transition-colors">
        {submitting
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording…</>
          : <><CheckCircle className="w-4 h-4" /> Record Event on Blockchain</>}
      </button>
    </form>
  );
}
