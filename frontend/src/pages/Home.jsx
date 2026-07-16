import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  Leaf,
  Shield,
  QrCode,
  Lock,
  ArrowRight,
  ClipboardList,
  Truck,
  CheckCircle2,
  Award,
  Sprout,
  Package,
  Users,
  Activity,
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { useContract } from '../hooks/useContract';

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: ClipboardList,
    title: 'Register',
    desc: 'Farmers register their product on-chain with full provenance data — farm location, harvest date, and certifications.',
    color: 'bg-green-600',
  },
  {
    step: 2,
    icon: Truck,
    title: 'Track',
    desc: 'Every handoff across the supply chain — processing, packaging, shipping, delivery — is recorded as an immutable blockchain event.',
    color: 'bg-emerald-600',
  },
  {
    step: 3,
    icon: QrCode,
    title: 'Verify',
    desc: 'Consumers scan a QR code on the product packaging to view the complete, tamper-proof journey from farm to shelf.',
    color: 'bg-teal-600',
  },
  {
    step: 4,
    icon: Award,
    title: 'Certify',
    desc: 'Certified inspectors issue organic or quality certifications that are permanently stored on the blockchain.',
    color: 'bg-amber-500',
  },
];

const WHY_AGROCHAIN = [
  {
    icon: Lock,
    title: 'Immutable Records',
    desc: 'Every supply chain event is written to the blockchain and cannot be altered or deleted, providing a permanent audit trail.',
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-100',
  },
  {
    icon: QrCode,
    title: 'QR Verification',
    desc: 'Consumers can instantly verify product authenticity and provenance by scanning the QR code on the packaging.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  {
    icon: Shield,
    title: 'Anti-Fraud Protection',
    desc: 'Cryptographic proofs prevent counterfeit products from entering the supply chain, protecting brands and consumers.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
];

// Map a blockchain Product struct → shape ProductCard expects
function mapProduct(p, farmerName) {
  return {
    id: Number(p.productId),
    name: p.name,
    batch_number: p.batchNumber,
    product_type: p.productType,
    is_organic: p.isOrganic,
    is_certified: p.isCertified,
    farmer_name: farmerName || null,
    farm_location: p.farmLocation,
    // harvestDate is a unix timestamp (BigNumber) — convert to ISO string
    harvest_date: p.harvestDate && Number(p.harvestDate) > 0
      ? new Date(Number(p.harvestDate) * 1000).toISOString()
      : null,
  };
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getAgroChain } = useContract();

  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [trackId, setTrackId] = useState('');

  const isFarmer = user?.role === 'FARMER';

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const contract = getAgroChain();
        const currentBlock = await contract.provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 100000);

        // ── Stats from blockchain ─────────────────────────────────────────────
        const [totalBN, actorEvents, eventEvents, certEvents] = await Promise.all([
          contract.getTotalProducts(),
          contract.queryFilter(contract.filters.ActorRegistered(), fromBlock),
          contract.queryFilter(contract.filters.EventRecorded(), fromBlock),
          contract.queryFilter(contract.filters.ProductCertified(), fromBlock),
        ]);
        if (!cancelled) {
          setStats({
            total_products: Number(totalBN),
            total_actors: actorEvents.length,
            total_events: eventEvents.length,
            certified_products: certEvents.length,
          });
        }

        // ── Products from blockchain ──────────────────────────────────────────
        const registeredEvents = await contract.queryFilter(
          contract.filters.ProductRegistered(),
          fromBlock,
        );

        // Filter: FARMER sees only their own; everyone else sees all
        const filtered = isFarmer
          ? registeredEvents.filter(
              (e) => (e.args.farmer || e.args[2])?.toLowerCase() === user.address.toLowerCase(),
            )
          : registeredEvents;

        // Take the 6 most recent
        const recent = [...filtered].reverse().slice(0, 6);

        const details = await Promise.all(
          recent.map(async (e) => {
            const id = e.args.productId || e.args[0];
            try {
              const p = await contract.getProduct(id);
              // Fetch farmer name from actor registry
              let farmerName = null;
              try {
                const actor = await contract.getActor(p.farmer);
                farmerName = actor.name || null;
              } catch {}
              return mapProduct(p, farmerName);
            } catch {
              return null;
            }
          }),
        );

        if (!cancelled) {
          setProducts(details.filter(Boolean));
        }
      } catch (err) {
        console.error('Home: failed to load blockchain data', err);
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user?.role, user?.address]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!trackId.trim()) return;
    navigate(`/track/${encodeURIComponent(trackId.trim())}`);
  };

  const sectionTitle = isFarmer ? 'My Products' : 'Recent Products';
  const sectionDesc = isFarmer
    ? 'Products you have registered on AgroChain'
    : 'Latest products registered on AgroChain';

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-emerald-800 text-white">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-24 w-72 h-72 bg-green-400/15 rounded-full blur-2xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-amber-400/10 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-green-800/60 border border-green-700/50 rounded-full px-4 py-1.5 mb-6">
              <Sprout className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-green-300">Blockchain-Powered Food Traceability</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
              From Farm to Fork,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
                Verified on the Blockchain
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-green-200 leading-relaxed max-w-2xl">
              AgroChain creates an immutable, transparent record of every step your food takes —
              from harvest to your plate. Empower consumers, protect farmers, and build trust in
              the global food supply chain.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/track')}
                className="flex items-center gap-2 px-6 py-3.5 bg-white text-green-800 font-bold rounded-xl shadow-lg hover:bg-green-50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-150"
              >
                <Search className="w-5 h-5" />
                Track a Product
              </button>
              {user?.role === 'FARMER' && (
                <button
                  onClick={() => navigate('/register')}
                  className="flex items-center gap-2 px-6 py-3.5 bg-green-600 text-white font-bold rounded-xl border border-green-500 shadow-lg hover:bg-green-500 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-150"
                >
                  <PlusCircle className="w-5 h-5" />
                  Register Product
                </button>
              )}
            </div>

            <form onSubmit={handleSearch} className="mt-8 flex max-w-md gap-2">
              <input
                type="text"
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                placeholder="Enter product ID or batch number…"
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-green-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-400 transition-colors text-sm"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="bg-white border-b border-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { label: 'Products Registered', value: stats?.total_products ?? '—', icon: Package, color: 'text-green-600' },
              { label: 'Certified Products',  value: stats?.certified_products ?? '—', icon: Award,    color: 'text-emerald-600' },
              { label: 'Supply Chain Events', value: stats?.total_events ?? '—',      icon: Activity,  color: 'text-blue-600' },
              { label: 'Network Actors',      value: stats?.total_actors ?? '—',      icon: Users,     color: 'text-purple-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-50 mb-2">
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className="text-2xl font-extrabold text-gray-900">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-gradient-to-b from-green-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-3">
              Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">How It Works</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              Four simple steps to create a complete, verifiable record of your product's journey.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc, color }) => (
              <div
                key={step}
                className="relative flex flex-col items-start p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200"
              >
                <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-4 shadow-sm`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="absolute top-4 right-4 text-5xl font-black text-gray-50 select-none leading-none">
                  {step}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why AgroChain ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block bg-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-3">
              Why AgroChain
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Built for Trust</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              Leveraging blockchain technology to bring transparency to every step of the food supply chain.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {WHY_AGROCHAIN.map(({ icon: Icon, title, desc, color, bg, border }) => (
              <div
                key={title}
                className={`${bg} ${border} border rounded-2xl p-8 flex flex-col gap-4 hover:shadow-md transition-shadow duration-200`}
              >
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                  <Icon className={`w-7 h-7 ${color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recent / My Products ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-2">
                Live Data
              </span>
              <h2 className="text-2xl font-extrabold text-gray-900">{sectionTitle}</h2>
              <p className="text-gray-500 text-sm mt-1">{sectionDesc}</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="hidden sm:flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800 transition-colors"
            >
              View all <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
                  <div className="h-3 bg-gray-100 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
                  <div className="h-8 bg-gray-100 rounded mt-4" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <Leaf className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">
                {isFarmer ? 'You have not registered any products yet' : 'No products registered yet'}
              </p>
              {user?.role === 'FARMER' && (
                <button
                  onClick={() => navigate('/register')}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-green-600 hover:text-green-700"
                >
                  <PlusCircle className="w-4 h-4" />
                  Register the first product
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onClick={() => navigate(`/track/${p.id}`)}
                />
              ))}
            </div>
          )}

          <div className="mt-8 text-center sm:hidden">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-green-700"
            >
              View all products <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bg-gradient-to-br from-green-800 to-emerald-900 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Leaf className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h2 className="text-3xl font-extrabold text-white mb-4">
            Ready to Join the Transparent Food Economy?
          </h2>
          <p className="text-green-200 text-lg mb-8 max-w-xl mx-auto">
            Register your farm's products today and give consumers the transparency they deserve.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            {user?.role === 'FARMER' && (
              <button
                onClick={() => navigate('/register')}
                className="flex items-center gap-2 px-8 py-3.5 bg-white text-green-800 font-bold rounded-xl shadow-lg hover:bg-green-50 transition-all duration-150"
              >
                <PlusCircle className="w-5 h-5" />
                Register a Product
              </button>
            )}
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-8 py-3.5 bg-green-700 text-white font-bold rounded-xl border border-green-600 shadow hover:bg-green-600 transition-all duration-150"
            >
              View Dashboard
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
