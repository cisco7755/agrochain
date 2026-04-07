import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Leaf, LayoutDashboard, PlusCircle, Search, Users,
  Menu, X, ShieldAlert, Info, LogOut, Wallet, User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../hooks/useWallet';
import toast from 'react-hot-toast';

// Links visible to all authenticated users
const BASE_LINKS = [
  { to: '/', label: 'Home', exact: true },
  { to: '/track', label: 'Track', icon: Search },
  { to: '/about', label: 'About', icon: Info },
];

// Role-specific extra links
const ROLE_LINKS = {
  ADMIN:       [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/register', label: 'Register', icon: PlusCircle },
    { to: '/actors', label: 'Actors', icon: Users },
    { to: '/recalls', label: 'Recalls', icon: ShieldAlert },
  ],
  FARMER:      [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }, { to: '/register', label: 'Register', icon: PlusCircle }],
  PROCESSOR:   [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  DISTRIBUTOR: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  RETAILER:    [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  CERTIFIER:   [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  VIEWER:      [],
};

const ROLE_COLORS = {
  ADMIN: 'bg-purple-100 text-purple-700',
  FARMER: 'bg-green-100 text-green-700',
  CERTIFIER: 'bg-amber-100 text-amber-700',
  DISTRIBUTOR: 'bg-blue-100 text-blue-700',
  RETAILER: 'bg-pink-100 text-pink-700',
  PROCESSOR: 'bg-indigo-100 text-indigo-700',
  VIEWER: 'bg-gray-100 text-gray-600',
};

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { disconnectWallet } = useWallet();

  const role = user?.role;
  const roleExtra = ROLE_LINKS[role] || [];
  const navLinks = [...BASE_LINKS, ...roleExtra].sort((a, b) => {
    const order = ['/', '/dashboard', '/register', '/track', '/recalls', '/actors', '/about'];
    return order.indexOf(a.to) - order.indexOf(b.to);
  });

  const linkClass = ({ isActive }) =>
    isActive
      ? 'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-green-700 bg-green-50'
      : 'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-green-700 hover:bg-green-50 transition-all';

  const handleDisconnect = () => {
    disconnectWallet(); // sets localStorage flag
    logout();
    setUserMenuOpen(false);
    setMenuOpen(false);
    window.location.reload(); // reload so AppContent sees the disconnected state
  };

  // Shorten wallet address for display
  const shortAddr = user?.address
    ? `${user.address.slice(0, 6)}…${user.address.slice(-4)}`
    : user?.name || '';

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center shadow-sm">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-gray-900">AgroChain</span>
              <p className="text-xs text-green-600 font-semibold leading-none -mt-0.5">FARM TO FORK</p>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-0.5">
            {navLinks.map(({ to, label, exact }) => (
              <NavLink key={to} to={to} end={exact} className={linkClass}>{label}</NavLink>
            ))}
          </div>

          {/* Wallet info */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center">
                  <Wallet className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-gray-800 leading-tight font-mono">{shortAddr}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${ROLE_COLORS[role] || ROLE_COLORS.VIEWER}`}>
                    {role || 'VIEWER'}
                  </span>
                </div>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl border border-gray-100 shadow-lg py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-50">
                    <p className="text-xs text-gray-500 font-semibold">{user?.name}</p>
                    <p className="text-xs text-gray-400 font-mono truncate">{user?.address?.slice(0, 20)}…</p>
                  </div>
                  <Link to="/profile" onClick={() => setUserMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    <User className="w-4 h-4" /> View Profile
                  </Link>
                  <button
                    onClick={handleDisconnect}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" /> Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>

          <button onClick={() => setMenuOpen((v) => !v)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
            {menuOpen ? <X className="w-5 h-5 text-gray-600" /> : <Menu className="w-5 h-5 text-gray-600" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {navLinks.map(({ to, label, icon: Icon, exact }) => (
            <NavLink key={to} to={to} end={exact} onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${isActive ? 'text-green-700 bg-green-50 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
              {Icon && <Icon className="w-4 h-4" />} {label}
            </NavLink>
          ))}
          <div className="pt-2 border-t border-gray-100">
            <p className="px-3 py-1 text-xs text-gray-500 font-mono">{shortAddr} · <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${ROLE_COLORS[role] || ROLE_COLORS.VIEWER}`}>{role}</span></p>
            <Link to="/profile" onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
              <User className="w-4 h-4" /> View Profile
            </Link>
            <button onClick={handleDisconnect} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
              <LogOut className="w-4 h-4" /> Disconnect Wallet
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
