import { useState, useEffect } from 'react';
import { Leaf, AlertTriangle, RefreshCw, Wallet, LogIn, UserPlus } from 'lucide-react';
import { CONTRACT_CONFIG } from '../../config/contracts';

const WalletConnect = ({ onConnect, error, isConnected, isCorrectNetwork, onSwitchNetwork }) => {
  const [hasMetaMask, setHasMetaMask] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const check = () => setHasMetaMask(!!window.ethereum);
    check();
    window.addEventListener('ethereum#initialized', check);
    const t = setTimeout(check, 500);
    return () => { clearTimeout(t); window.removeEventListener('ethereum#initialized', check); };
  }, []);

  const networkLabel = CONTRACT_CONFIG.chainId === 31337 ? 'Hardhat Local' : 'Polygon Amoy';

  const handleSwitch = async () => {
    setSwitching(true); setSwitchError(null);
    try { await onSwitchNetwork(); }
    catch { setSwitchError('Could not switch automatically. Please switch manually in MetaMask.'); }
    finally { setSwitching(false); }
  };

  const handleConnect = async () => {
    setConnecting(true);
    await onConnect();
    setConnecting(false);
  };

  // Wrong network screen
  if (isConnected && !isCorrectNetwork) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-emerald-700 px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Wrong Network</h2>
          <p className="text-gray-500 text-sm mb-6">
            AgroChain requires <strong>{networkLabel}</strong>. Click below and MetaMask will switch automatically.
          </p>
          {switchError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs text-left">{switchError}</div>
          )}
          <button onClick={handleSwitch} disabled={switching}
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
            {switching
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Switching…</>
              : <><RefreshCw className="w-4 h-4" /> Switch to {networkLabel}</>}
          </button>
        </div>
      </div>
    );
  }

  // Main login / sign-up screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Leaf className="w-8 h-8 text-green-700" />
          </div>
          <h1 className="text-3xl font-bold text-white">AgroChain</h1>
          <p className="text-green-200 text-sm mt-1">Farm to Fork, Verified on Blockchain</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Welcome back</h2>
          <p className="text-gray-500 text-sm text-center mb-8">
            Connect your MetaMask wallet to access the supply chain platform
          </p>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {hasMetaMask ? (
            <div className="space-y-3">
              {/* Sign In */}
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold rounded-xl transition-colors shadow-sm"
              >
                {connecting ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Connecting…</>
                ) : (
                  <><LogIn className="w-5 h-5" /> Sign In with Wallet</>
                )}
              </button>

              {/* Sign Up */}
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 border-2 border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-50 font-bold rounded-xl transition-colors"
              >
                <UserPlus className="w-5 h-5" /> Create Account
              </button>
            </div>
          ) : (
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 text-center bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors"
            >
              Install MetaMask to Continue
            </a>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-400 justify-center">
              <Wallet className="w-3.5 h-3.5" />
              <span>Both options connect via MetaMask — your wallet is your identity</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnect;
