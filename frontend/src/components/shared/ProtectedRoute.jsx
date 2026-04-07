import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

/**
 * allowedRoles: string[]  — roles that may access this route.
 * If empty / omitted, any authenticated user is allowed.
 * Unauthenticated users always get redirected.
 */
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/" replace />;

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm mb-1">
            Your role <span className="font-semibold text-gray-700">({user?.role})</span> does not have permission to view this page.
          </p>
          <p className="text-gray-400 text-xs mb-6">
            Required: {allowedRoles.join(', ')}
          </p>
          <a href="/dashboard"
            className="inline-block px-6 py-2.5 bg-green-600 text-white font-semibold text-sm rounded-xl hover:bg-green-700">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
}
