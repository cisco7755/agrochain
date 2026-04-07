import { useEffect, useState } from 'react';
import {
  Wallet, User, MapPin, Shield, Calendar, CheckCircle,
  Copy, ExternalLink, Package, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useContract } from '../hooks/useContract';
import toast from 'react-hot-toast';

const ROLE_NAMES = ['NONE', 'FARMER', 'PROCESSOR', 'DISTRIBUTOR', 'RETAILER', 'CERTIFIER'];

const ROLE_CONFIG = {
  ADMIN:       { color: 'bg-purple-100 text-purple-800 border-purple-200', desc: 'Full system access — can register actors and manage the network' },
  FARMER:      { color: 'bg-green-100 text-green-800 border-green-200',   desc: 'Can register agricultural products on the blockchain' },
  PROCESSOR:   { color: 'bg-blue-100 text-blue-800 border-blue-200',     desc: 'Can record processing events in the supply chain' },
  DISTRIBUTOR: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200',desc: 'Can record shipping and logistics events' },
  RETAILER:    { color: 'bg-pink-100 text-pink-800 border-pink-200',     desc: 'Can record retail and sale events' },
  CERTIFIER:   { color: 'bg-amber-100 text-amber-800 border-amber-200',  desc: 'Can certify organic and quality standards' },
  VIEWER:      { color: 'bg-gray-100 text-gray-700 border-gray-200',     desc: 'Read-only access — not yet registered in the contract' },
};

function InfoRow({ icon: Icon, label, value, mono, action }) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-50 last:border-0">
      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className={`text-sm font-semibold text-gray-900 break-all ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
      </div>
      {action}
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const { getAgroChain } = useContract();
  const [actor, setActor] = useState(null);
  const [adminAddr, setAdminAddr] = useState(null);
  const [productCount, setProductCount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.address) return;
    const load = async () => {
      setLoading(true);
      try {
        const contract = getAgroChain();
        const [actorData, admin] = await Promise.all([
          contract.getActor(user.address),
          contract.admin(),
        ]);
        setActor(actorData);
        setAdminAddr(admin);

        // Count products if farmer/admin
        const roleIndex = Number(actorData.role);
        if (roleIndex === 1 || admin.toLowerCase() === user.address.toLowerCase()) {
          try {
            const filter = contract.filters.ProductRegistered(null, null, user.address);
            const currentBlock = await contract.provider.getBlockNumber();
            const events = await contract.queryFilter(filter, Math.max(0, currentBlock - 100000));
            setProductCount(events.length);
          } catch { setProductCount(0); }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.address]);

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const isAdmin = adminAddr && user?.address &&
    adminAddr.toLowerCase() === user.address.toLowerCase();

  const roleIndex = actor ? Number(actor.role) : 0;
  const roleName = isAdmin ? 'ADMIN' : (ROLE_NAMES[roleIndex] || 'VIEWER');
  const roleNotRegistered = !isAdmin && roleIndex === 0;
  const roleCfg = ROLE_CONFIG[roleName] || ROLE_CONFIG.VIEWER;

  const registeredAt = actor?.registeredAt
    ? new Date(Number(actor.registeredAt) * 1000)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium text-sm">Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 text-sm mt-0.5">Your wallet identity and blockchain role</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Identity card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Coloured banner */}
          <div className="h-24 bg-gradient-to-r from-green-700 to-emerald-600" />

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div className="w-20 h-20 rounded-2xl bg-green-600 border-4 border-white shadow-lg flex items-center justify-center">
                <Wallet className="w-9 h-9 text-white" />
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold border ${roleCfg.color}`}>
                {roleName}
              </span>
            </div>

            <h2 className="text-xl font-bold text-gray-900">
              {actor?.name || user?.name || 'Unknown'}
            </h2>
            {actor?.location && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5" /> {actor.location}
              </p>
            )}

            <p className="text-xs text-gray-400 mt-3 bg-gray-50 rounded-lg px-3 py-2 font-mono break-all">
              {user?.address}
            </p>
          </div>
        </div>

        {/* Not registered banner */}
        {roleNotRegistered && !isAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">Not registered in contract</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Your wallet is connected but has no role assigned. Contact the admin to be registered as a Farmer, Certifier, or other role.
              </p>
            </div>
          </div>
        )}

        {/* Stats row */}
        {(productCount !== null || isAdmin) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {productCount !== null && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                <Package className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{productCount}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Products Registered</p>
              </div>
            )}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{actor?.isActive ? 'Active' : 'N/A'}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Account Status</p>
            </div>
            {isAdmin && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                <Shield className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">Admin</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Contract Owner</p>
              </div>
            )}
          </div>
        )}

        {/* Full details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Account Details</h3>

          <InfoRow
            icon={User}
            label="Display Name"
            value={actor?.name || user?.name || 'Not set'}
          />
          <InfoRow
            icon={Shield}
            label="Role"
            value={roleName}
            action={
              <span className={`self-start mt-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${roleCfg.color}`}>
                {roleName}
              </span>
            }
          />
          <InfoRow
            icon={MapPin}
            label="Location"
            value={actor?.location || 'Not set'}
          />
          <InfoRow
            icon={Wallet}
            label="Wallet Address"
            value={user?.address}
            mono
            action={
              <button
                onClick={() => copy(user?.address)}
                className="self-start mt-1 p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <Copy className="w-4 h-4" />
              </button>
            }
          />
          {registeredAt && (
            <InfoRow
              icon={Calendar}
              label="Registered On-Chain"
              value={registeredAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            />
          )}
          {isAdmin && adminAddr && (
            <InfoRow
              icon={Shield}
              label="Contract Admin Address"
              value={adminAddr}
              mono
              action={
                <button
                  onClick={() => copy(adminAddr)}
                  className="self-start mt-1 p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </button>
              }
            />
          )}
        </div>

        {/* Role description */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Role Permissions</h3>
          <div className={`flex items-start gap-3 p-4 rounded-xl border ${roleCfg.color}`}>
            <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">{roleName}</p>
              <p className="text-xs mt-0.5 opacity-80">{roleCfg.desc}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
