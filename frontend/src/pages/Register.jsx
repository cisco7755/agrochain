import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Leaf, MapPin, User, Calendar, Hash, FileText,
  Package, ChevronRight, CheckCircle, Info, Loader2,
} from 'lucide-react';
import { createProduct } from '../services/api';
import { useAuth } from '../context/AuthContext';

const PRODUCT_TYPES = ['Vegetables', 'Fruits', 'Grains', 'Dairy', 'Meat', 'Other'];

function today() {
  return new Date().toISOString().split('T')[0];
}

function generateBatch() {
  const y = new Date().getFullYear();
  const n = String(Math.floor(Math.random() * 900) + 100);
  return `BATCH-${y}-${n}`;
}

function FieldLabel({ children, required }) {
  return (
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {children}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );
}

function Input({ ...props }) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition placeholder-gray-400"
    />
  );
}

function Textarea({ ...props }) {
  return (
    <textarea
      {...props}
      rows={3}
      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition placeholder-gray-400 resize-none"
    />
  );
}

function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
    >
      {children}
    </select>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const canRegister = isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'FARMER');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    product_type: 'Vegetables',
    batch_number: generateBatch(),
    farm_location: '',
    farm_size_acres: '',
    harvest_date: today(),
    expiry_date: '',
    is_organic: true,
    description: '',
    farmer_name: '',
    farmer_address: '',
  });

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.batch_number || !form.farm_location || !form.farmer_name) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        farm_size_acres: form.farm_size_acres ? parseFloat(form.farm_size_acres) : null,
        harvest_date: form.harvest_date || null,
        expiry_date: form.expiry_date || null,
      };
      const product = await createProduct(payload);
      toast.success(
        `Product registered! ID: #${product.id} · TX: ${product.blockchain_tx_hash?.slice(0, 10)}…`,
        { duration: 6000 }
      );
      navigate(`/track/${product.id}`);
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canRegister) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ChevronRight className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-500 text-sm mb-6">
            {isAuthenticated
              ? 'Only Farmers and Admins can register products.'
              : 'Please sign in with a Farmer or Admin account to register products.'}
          </p>
          <button onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
            className="px-6 py-2.5 bg-green-600 text-white font-semibold text-sm rounded-xl hover:bg-green-700">
            {isAuthenticated ? 'Go to Dashboard' : 'Sign In'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <span>Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-700 font-medium">Register Product</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Register New Product</h1>
          <p className="text-gray-500 text-sm mt-1">Create an immutable blockchain record for your agricultural product</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Product Details */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 text-green-700" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900">Product Information</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <FieldLabel required>Product Name</FieldLabel>
                    <Input
                      placeholder="e.g. Organic Tomatoes"
                      value={form.name}
                      onChange={set('name')}
                      required
                    />
                  </div>

                  <div>
                    <FieldLabel required>Product Type</FieldLabel>
                    <Select value={form.product_type} onChange={set('product_type')}>
                      {PRODUCT_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </Select>
                  </div>

                  <div>
                    <FieldLabel required>Batch Number</FieldLabel>
                    <div className="relative">
                      <Input
                        placeholder="BATCH-2024-001"
                        value={form.batch_number}
                        onChange={set('batch_number')}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, batch_number: generateBatch() }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-green-600 hover:text-green-700 font-medium px-1"
                      >
                        Generate
                      </button>
                    </div>
                  </div>

                  <div>
                    <FieldLabel required>Harvest Date</FieldLabel>
                    <Input type="date" value={form.harvest_date} onChange={set('harvest_date')} required />
                  </div>

                  <div>
                    <FieldLabel>Expiry Date</FieldLabel>
                    <Input type="date" value={form.expiry_date} onChange={set('expiry_date')} />
                  </div>

                  <div className="sm:col-span-2">
                    <FieldLabel>Description</FieldLabel>
                    <Textarea
                      placeholder="Describe the product, growing conditions, certifications, etc."
                      value={form.description}
                      onChange={set('description')}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={form.is_organic}
                          onChange={set('is_organic')}
                        />
                        <div className={`w-11 h-6 rounded-full transition-colors ${form.is_organic ? 'bg-green-600' : 'bg-gray-200'}`}>
                          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_organic ? 'translate-x-5' : ''}`} />
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-700">Organic Product</span>
                        <p className="text-xs text-gray-500">Mark this product as organically grown/produced</p>
                      </div>
                      {form.is_organic && <Leaf className="w-4 h-4 text-green-600 ml-auto" />}
                    </label>
                  </div>
                </div>
              </div>

              {/* Farm Details */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-emerald-700" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900">Farm Details</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <FieldLabel required>Farm Location</FieldLabel>
                    <Input
                      placeholder="e.g. Nairobi, Kenya"
                      value={form.farm_location}
                      onChange={set('farm_location')}
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel>Farm Size (acres)</FieldLabel>
                    <Input
                      type="number"
                      placeholder="e.g. 12.5"
                      min="0"
                      step="0.1"
                      value={form.farm_size_acres}
                      onChange={set('farm_size_acres')}
                    />
                  </div>
                </div>
              </div>

              {/* Farmer Info */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-700" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900">Farmer Information</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel required>Farmer Name</FieldLabel>
                    <Input
                      placeholder="e.g. Green Valley Farms"
                      value={form.farmer_name}
                      onChange={set('farmer_name')}
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel>Ethereum Address</FieldLabel>
                    <Input
                      placeholder="0x1234...abcd"
                      value={form.farmer_address}
                      onChange={set('farmer_address')}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold text-base rounded-xl shadow-green transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                {submitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Registering on Blockchain…</>
                ) : (
                  <><CheckCircle className="w-5 h-5" /> Register Product on Blockchain</>
                )}
              </button>
            </div>

            {/* Right: Preview */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sticky top-24">
                <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Preview</h3>

                <div className="space-y-3">
                  <div className="h-1.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />

                  <div>
                    <p className="text-xs text-gray-400 font-medium">Product Name</p>
                    <p className="text-base font-bold text-gray-900 mt-0.5">{form.name || '—'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Type</p>
                      <p className="font-semibold text-gray-700 mt-0.5">{form.product_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Batch</p>
                      <p className="font-mono font-semibold text-gray-700 mt-0.5 text-xs">{form.batch_number || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Location</p>
                      <p className="font-semibold text-gray-700 mt-0.5">{form.farm_location || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Farmer</p>
                      <p className="font-semibold text-gray-700 mt-0.5">{form.farmer_name || '—'}</p>
                    </div>
                  </div>

                  {form.is_organic && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                      <Leaf className="w-3.5 h-3.5" /> Organic
                    </span>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-start gap-2 text-xs text-gray-500 bg-green-50 rounded-lg p-3">
                      <Info className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>
                        Upon submission, this product will be registered on the Polygon Amoy Testnet with an immutable blockchain record and a unique transaction hash.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
