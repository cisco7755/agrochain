import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('AgroChain ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-10 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 text-sm mb-2">{this.state.error?.message || 'An unexpected error occurred'}</p>
          <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg p-3 mb-6 text-left break-all">
            {this.state.error?.stack?.split('\n')[0]}
          </p>
          <button onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 mx-auto px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors">
            <RefreshCw className="w-4 h-4" /> Reload Page
          </button>
        </div>
      </div>
    );
  }
}
