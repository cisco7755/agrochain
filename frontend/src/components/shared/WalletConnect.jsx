import { Wallet, AlertTriangle, RefreshCw } from 'lucide-react';

const WalletConnect = ({ onConnect, error, isConnected, isCorrectNetwork, onSwitchNetwork }) => {
  if (isConnected && !isCorrectNetwork) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Wrong Network</h2>
          <p className="text-gray-500 text-sm mb-6">
            AgroChain runs on Sepolia testnet. Please switch your network in MetaMask.
          </p>
          <button
            onClick={onSwitchNetwork}
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Switch to Sepolia
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Wallet className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">AgroChain</h1>
        <p className="text-green-600 text-sm font-medium mb-2">Decentralised Organic Traceability</p>
        <p className="text-gray-500 text-sm mb-6">
          Connect your MetaMask wallet to access the supply chain platform.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-left">
            {error}
          </div>
        )}

        {!window.ethereum ? (
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
          >
            Install MetaMask
          </a>
        ) : (
          <button
            onClick={onConnect}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Wallet className="w-5 h-5" />
            Connect Wallet
          </button>
        )}

        <p className="text-xs text-gray-400 mt-4">
          Powered by Ethereum Sepolia Testnet
        </p>
      </div>
    </div>
  );
};

export default WalletConnect;
