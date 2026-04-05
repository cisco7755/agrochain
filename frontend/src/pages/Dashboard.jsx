import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Package, Leaf, Award, Activity,
  Hash, Wifi, Zap, RefreshCw, ShieldAlert, Clock, Search, X,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import ProductCard from '../components/ProductCard';
import { getStats, getHealth, getProducts, getEvents, getRecalls, getExpiringProducts } from '../services/api';

const EVENT_COLORS = {
  REGISTERED: '#6b7280',
  HARVESTED: '#16a34a',
  PROCESSED: '#2563eb',
  PACKAGED: '#7c3aed',
  SHIPPED: '#d97706',
  RECEIVED: '#059669',
  CERTIFIED: '#ca8a04',
  SOLD: '#9333ea',
};

const EVENT_LABELS = {
  REGISTERED: 'Registered', HARVESTED: 'Harvested', PROCESSED: 'Processed',
  PACKAGED: 'Packaged', SHIPPED: 'Shipped', RECEIVED: 'Received',
  CERTIFIED: 'Certified', SOLD: 'Sold',
};

const ROLE_COLORS = {
  FARMER: 'bg-green-100 text-green-800',
  DISTRIBUTOR: 'bg-blue-100 text-blue-800',
  RETAILER: 'bg-purple-100 text-purple-800',
  CERTIFIER: 'bg-amber-100 text-amber-800',
  PROCESSOR: 'bg-indigo-100 text-indigo-800',
};

function formatDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
}

function NetworkCard({ health }) {
  if (!health) return null;
  const bc = health.blockchain || {};
  return (
    <div className="bg-gradient-to-br from-green-900 to-emerald-800 rounded-xl p-5 text-white shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Wifi className="w-5 h-5 text-green-300" />
        <h3 className="font-bold text-base">Blockchain Network</h3>
        <span className="ml-auto flex items-center gap-1.5 bg-green-700/50 px-2 py-0.5 rounded-full text-xs font-medium">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          Live
        </span>
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-green-300">Network</span>
          <span className="font-semibold">{bc.network || 'Polygon Amoy Testnet'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-300">Chain ID</span>
          <span className="font-mono font-semibold">{bc.chain_id || 80002}</span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-green-300">Contract</span>
          <span className="font-mono text-xs bg-green-800/60 px-2 py-0.5 rounded truncate max-w-[140px]">
            {bc.contract_address ? `${bc.contract_address.slice(0, 10)}...${bc.contract_address.slice(-6)}` : '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-300">Block</span>
          <span className="font-mono font-semibold">{(bc.block_number || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-300">Gas Price</span>
          <span className="font-semibold flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            {bc.gas_price_gwei} Gwei
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [products, setProducts] = useState([]);
  const [events, setEvents] = useState([]);
  const [recalls, setRecalls] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [s, h, p, e, r, ex] = await Promise.all([
        getStats(), getHealth(), getProducts(0, 50), getEvents(),
        getRecalls(), getExpiringProducts(7),
      ]);
      setStats(s);
      setHealth(h);
      setProducts(p);
      setEvents(e.slice(0, 8));
      setRecalls(r.filter((rc) => !rc.is_resolved).slice(0, 5));
      setExpiring(ex.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredProducts = products.filter((p) => {
    const matchSearch = !productSearch ||
      p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.batch_number?.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.farmer_name?.toLowerCase().includes(productSearch.toLowerCase());
    const matchFilter =
      filterType === 'all' ? true :
      filterType === 'organic' ? p.is_organic :
      filterType === 'certified' ? p.is_certified :
      filterType === 'recalled' ? p.is_recalled : true;
    return matchSearch && matchFilter;
  }).slice(0, 6);

  const chartData = stats?.event_type_counts
    ? Object.entries(stats.event_type_counts).map(([key, val]) => ({
        name: EVENT_LABELS[key] || key,
        count: val,
        key,
      }))
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">AgroChain supply chain overview</p>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Expiry / Recall Alerts */}
        {(expiring.length > 0 || recalls.length > 0) && (
          <div className="space-y-2">
            {expiring.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-amber-800">
                  {expiring.length} product{expiring.length > 1 ? 's' : ''} expiring within 7 days:{' '}
                  <span className="font-normal">{expiring.map((p) => p.name).join(', ')}</span>
                </p>
                <button onClick={() => navigate('/track')} className="ml-auto text-xs font-semibold text-amber-700 underline flex-shrink-0">View</button>
              </div>
            )}
            {recalls.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-red-800">
                  {recalls.length} active recall{recalls.length > 1 ? 's' : ''}:{' '}
                  <span className="font-normal">{recalls.map((r) => r.reason).join('; ')}</span>
                </p>
                <button onClick={() => navigate('/recalls')} className="ml-auto text-xs font-semibold text-red-700 underline flex-shrink-0">Manage</button>
              </div>
            )}
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total Products" value={stats?.total_products ?? 0} icon={Package} color="green" subtitle="Registered on-chain" />
          <StatCard title="Organic" value={stats?.organic_products ?? 0} icon={Leaf} color="emerald" subtitle="Organic products" />
          <StatCard title="Certified" value={stats?.certified_products ?? 0} icon={Award} color="amber" subtitle="Fully certified" />
          <StatCard title="Recalled" value={stats?.recalled_products ?? recalls.length} icon={ShieldAlert} color="red" subtitle="Active recalls" />
          <StatCard title="Events" value={stats?.total_events ?? 0} icon={Activity} color="blue" subtitle="Supply chain events" />
        </div>

        {/* Chart + Network */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-5">Supply Chain Events Distribution</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    cursor={{ fill: '#f9fafb' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.key} fill={EVENT_COLORS[entry.key] || '#16a34a'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-gray-400 text-sm">No event data yet</div>
            )}
          </div>
          <NetworkCard health={health} />
        </div>

        {/* Products + Events */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Products */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900">Products</h2>
              <button onClick={() => navigate('/register')} className="text-sm font-medium text-green-600 hover:text-green-700">
                + Register new
              </button>
            </div>
            {/* Search + Filter */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search by name, batch, farmer…"
                  className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {productSearch && (
                  <button onClick={() => setProductSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-2 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="all">All</option>
                <option value="organic">Organic</option>
                <option value="certified">Certified</option>
                <option value="recalled">Recalled</option>
              </select>
            </div>
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} onClick={() => navigate(`/track/${p.id}`)} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center text-gray-400 text-sm">
                {productSearch || filterType !== 'all' ? 'No products match your filter' : 'No products registered yet'}
              </div>
            )}
          </div>

          {/* Recent Events */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Recent Events</h2>
              <span className="text-xs text-gray-400 font-medium">Last {events.length}</span>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {events.length > 0 ? events.map((ev, i) => (
                <div key={ev.id || i} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: EVENT_COLORS[ev.event_type] || '#6b7280' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-700">{EVENT_LABELS[ev.event_type] || ev.event_type}</span>
                      {ev.actor_role && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[ev.actor_role] || 'bg-gray-100 text-gray-600'}`}>
                          {ev.actor_role}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {ev.actor_name} · {ev.location}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(ev.timestamp)}</span>
                </div>
              )) : (
                <div className="p-8 text-center text-gray-400 text-sm">No events yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
