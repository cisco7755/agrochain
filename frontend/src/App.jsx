import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ContractProvider } from './context/ContractContext';
import ErrorBoundary from './components/ErrorBoundary';

import { useWallet } from './hooks/useWallet';
import { useRole } from './hooks/useRole';

import WalletConnect from './components/shared/WalletConnect';
import LoadingSpinner from './components/shared/LoadingSpinner';
import NotAuthorised from './pages/NotAuthorised';

import AdminDashboard from './components/admin/AdminDashboard';
import FarmerDashboard from './components/farmer/FarmerDashboard';
import CertifierDashboard from './components/certifier/CertifierDashboard';
import DistributorDashboard from './components/distributor/DistributorDashboard';
import RetailerDashboard from './components/retailer/RetailerDashboard';
import ConsumerDashboard from './components/consumer/ConsumerDashboard';

// Legacy public pages still accessible via URL
import Navbar from './components/Navbar';
import Verify from './pages/Verify';
import About from './pages/About';
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

const PendingRegistration = ({ account }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">⏳</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Pending Registration</h2>
      <p className="text-gray-500 text-sm mb-4">
        Your wallet is connected but has not been assigned a role yet. Please contact the AgroChain administrator to register your account.
      </p>
      <p className="text-xs font-mono bg-gray-100 rounded p-2 text-gray-600 break-all">{account}</p>
    </div>
  </div>
);

const ROLE_DASHBOARDS = {
  ADMIN: AdminDashboard,
  FARMER: FarmerDashboard,
  CERTIFIER: CertifierDashboard,
  DISTRIBUTOR: DistributorDashboard,
  RETAILER: RetailerDashboard,
  CONSUMER: ConsumerDashboard,
};

function BlockchainApp() {
  const { account, isConnected, isCorrectNetwork, error, loading: walletLoading, connectWallet, switchToSepolia } = useWallet();
  const { roleName, isActive, loading: roleLoading } = useRole(isConnected && isCorrectNetwork ? account : null);

  if (walletLoading) return <LoadingSpinner message="Connecting to wallet..." />;

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

  if (roleLoading) return <LoadingSpinner message="Fetching your role from blockchain..." />;

  if (!isActive && roleName !== 'NONE') {
    return <NotAuthorised account={account} roleName={roleName} />;
  }

  const Dashboard = ROLE_DASHBOARDS[roleName];
  if (!Dashboard) return <PendingRegistration account={account} />;

  return <Dashboard account={account} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ContractProvider>
          <BrowserRouter>
            <Routes>
              {/* Public verification route — no wallet needed */}
              <Route path="/verify/:productId" element={<Verify />} />
              <Route path="/about" element={
                <div className="min-h-screen flex flex-col bg-gray-50">
                  <Navbar />
                  <main className="flex-1"><About /></main>
                </div>
              } />
              {/* All other routes → blockchain DApp */}
              <Route path="/*" element={<BlockchainApp />} />
            </Routes>
            <Toaster position="top-right" toastOptions={TOAST_OPTIONS} />
          </BrowserRouter>
        </ContractProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
