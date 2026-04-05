import { useNavigate } from 'react-router-dom';
import { Leaf, Home, Search } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-agro-light flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-24 h-24 bg-green-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Leaf className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-6xl font-bold text-green-700 mb-2">404</h1>
        <h2 className="text-xl font-bold text-gray-900 mb-3">Page Not Found</h2>
        <p className="text-gray-500 text-sm mb-8">
          This page has gone off the supply chain. Let's get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors">
            <Home className="w-4 h-4" /> Go Home
          </button>
          <button onClick={() => navigate('/track')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-green-700 font-semibold rounded-xl border border-green-200 hover:bg-green-50 transition-colors">
            <Search className="w-4 h-4" /> Track Product
          </button>
        </div>
      </div>
    </div>
  );
}
