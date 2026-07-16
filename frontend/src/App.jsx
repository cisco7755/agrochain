import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ContractProvider } from './context/ContractContext';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './context/AuthContext';
import { useWallet } from './hooks/useWallet';
import { useContract } from './hooks/useContract';
import { shortenAddress } from './utils/hashUtils';

import WalletConnect from './components/shared/WalletConnect';
import LoadingSpinner from './components/shared/LoadingSpinner';
import ProtectedRoute from './components/shared/ProtectedRoute';

import Navbar from './components/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Register from './pages/Register';
import Track from './pages/Track';
import Verify from './pages/Verify';
import Actors from './pages/Actors';
import Recalls from './pages/Recalls';
import About from './pages/About';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

const TOAST_OPTIONS = {
  duration: 5000,
  style: {
    background: '#fff', color: '#1f2937',
    border: '1px solid #d1fae5', borderRadius: '0.75rem',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
    fontSize: '14px', fontWeight: '500',
  },
  success: {
    iconTheme: { primary: '#16a34a', secondary: '#fff' },
    style: { border: '1px solid #bbf7d0', background: '#f0fdf4' },
  },
  error: {
    iconTheme: { primary: '#ef4444', secondary: '#fff' },
    style: { border: '1px solid #fecaca', background: '#fef2f2' },
  },
};

const ROLE_NAMES = ['NONE', 'FARMER', 'PROCESSOR', 'DISTRIBUTOR', 'RETAILER', 'CERTIFIER'];

function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public — any connected wallet */}
          <Route path="/" element={<Home />} />
          <Route path="/track" element={<Track />} />
          <Route path="/track/:productId" element={<Track />} />
          <Route path="/about" element={<About />} />
          <Route path="/profile" element={<Profile />} />

          {/* Any connected wallet — Dashboard itself routes VIEWER to a self-registration
              form and PENDING to an approval-status screen */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['FARMER','PROCESSOR','DISTRIBUTOR','RETAILER','CERTIFIER','ADMIN','VIEWER','PENDING']}>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* FARMER only — the contract restricts registerProduct to the FARMER role */}
          <Route path="/register" element={
            <ProtectedRoute allowedRoles={['FARMER']}>
              <Register />
            </ProtectedRoute>
          } />

          {/* ADMIN only */}
          <Route path="/actors" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Actors />
            </ProtectedRoute>
          } />
          <Route path="/recalls" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Recalls />
            </ProtectedRoute>
          } />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

function AppContent() {
  const { account, isConnected, isCorrectNetwork, error, loading, connectWallet, switchToSepolia } = useWallet();
  const { login, logout } = useAuth();
  const { getAgroChain } = useContract();
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    if (!isConnected || !isCorrectNetwork || !account) {
      logout();
      return;
    }

    setRoleLoading(true);
    const loadRole = async () => {
      try {
        const contract = getAgroChain();
        const [actor, adminAddr] = await Promise.all([
          contract.getActor(account),
          contract.admin(),
        ]);

        const isAdmin = adminAddr.toLowerCase() === account.toLowerCase();

        let role, name;
        if (isAdmin) {
          role = 'ADMIN';
          name = actor.name || 'Admin';
        } else {
          const roleIndex = Number(actor.role);
          if (roleIndex > 0 && !actor.isActive) {
            // Self-registered via requestRegistration but not yet approved —
            // read-only until an admin calls approveActor.
            role = 'PENDING';
          } else {
            role = roleIndex > 0 ? (ROLE_NAMES[roleIndex] || 'VIEWER') : 'VIEWER';
          }
          name = actor.name || shortenAddress(account);
        }

        login(null, {
          name,
          role,
          address: account,
          requestedRole: role === 'PENDING' ? (ROLE_NAMES[Number(actor.role)] || null) : null,
          location: actor.location || '',
        });
      } catch {
        // Wallet connected but not registered in contract — still let them in as VIEWER
        login(null, { name: shortenAddress(account), role: 'VIEWER', address: account });
      } finally {
        setRoleLoading(false);
      }
    };

    loadRole();
  }, [account, isConnected, isCorrectNetwork]);

  if (loading || roleLoading) return <LoadingSpinner message="Loading wallet…" />;

  if (!isConnected || !isCorrectNetwork) {
    return (
      <WalletConnect
        onConnect={connectWallet}
        error={error}
        isConnected={isConnected}
        isCorrectNetwork={isCorrectNetwork}
        onSwitchNetwork={switchToSepolia}
      />
    );
  }

  return (
    <Routes>
      {/* Public consumer verify — no Navbar */}
      <Route path="/verify/:productId" element={<Verify />} />
      <Route path="/verify/:productId/:unitNumber" element={<Verify />} />
      {/* Main app with Navbar */}
      <Route path="/*" element={<Layout />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ContractProvider>
          <BrowserRouter>
            <AppContent />
            <Toaster position="top-right" toastOptions={TOAST_OPTIONS} />
          </BrowserRouter>
        </ContractProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
