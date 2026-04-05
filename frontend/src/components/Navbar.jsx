import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Leaf, LayoutDashboard, PlusCircle, Search, Users,
  Menu, X, ShieldAlert, Info, LogIn, LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const PUBLIC_LINKS = [
  { to: '/', label: 'Home', exact: true },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/track', label: 'Track', icon: Search },
  { to: '/recalls', label: 'Recalls', icon: ShieldAlert },
  { to: '/about', label: 'About', icon: Info },
];

const ADMIN_LINKS = [
  { to: '/register', label: 'Register', icon: PlusCircle },
  { to: '/actors', label: 'Actors', icon: Users },
];

const FARMER_LINKS = [
  { to: '/register', label: 'Register', icon: PlusCircle },
];

const ROLE_COLORS = {
  ADMIN: 'bg-purple-100 text-purple-700',
  FARMER: 'bg-green-100 text-green-700',
  CERTIFIER: 'bg-amber-100 text-amber-700',
  DISTRIBUTOR: 'bg-blue-100 text-blue-700',
  RETAILER: 'bg-pink-100 text-pink-700',
  VIEWER: 'bg-gray-100 text-gray-600',
};

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  const role = user?.role;
  const extraLinks = role === 'ADMIN' ? ADMIN_LINKS : role === 'FARMER' ? FARMER_LINKS : [];
  const navLinks = [...PUBLIC_LINKS, ...extraLinks].sort((a, b) => {
    const order = ['/', '/dashboard', '/register', '/track', '/recalls', '/actors', '/about'];
    return order.indexOf(a.to) - order.indexOf(b.to);
  });

  const linkClass = ({ isActive }) =>
    isActive
      ? 'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-green-700 bg-green-50'
      : 'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-green-700 hover:bg-green-50 transition-all';

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    toast.success('Signed out');
    navigate('/');
  };

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

          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                  <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${ROLE_COLORS[user?.role] || ROLE_COLORS.VIEWER}`}>
                      {user?.role}
                    </span>
                  </div>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl border border-gray-100 shadow-lg py-1 z-50">
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login"
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-green-700 border border-green-200 rounded-xl hover:bg-green-50 transition-colors">
                  <LogIn className="w-4 h-4" /> Sign In
                </Link>
                <Link to="/signup"
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-sm">
                  <PlusCircle className="w-4 h-4" /> Register
                </Link>
              </>
            )}
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
            {isAuthenticated ? (
              <div>
                <p className="px-3 py-1 text-xs text-gray-500"><strong>{user?.name}</strong> · {user?.role}</p>
                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            ) : (
              <div className="flex gap-2 mt-1">
                <Link to="/login" onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2.5 text-sm font-semibold text-green-700 border border-green-200 rounded-xl">Sign In</Link>
                <Link to="/signup" onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2.5 text-sm font-bold text-white bg-green-600 rounded-xl">Register</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
