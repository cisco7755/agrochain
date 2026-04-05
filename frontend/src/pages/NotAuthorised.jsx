import { ShieldOff } from 'lucide-react';

const NotAuthorised = ({ account, roleName }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <ShieldOff className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-500 text-sm mb-4">
        You do not have permission to view this page.
      </p>
      {account && (
        <p className="text-xs text-gray-400 font-mono bg-gray-100 rounded p-2">
          {account}
        </p>
      )}
      {roleName && roleName !== 'NONE' && (
        <p className="text-sm text-gray-600 mt-2">Your role: <strong>{roleName}</strong></p>
      )}
    </div>
  </div>
);

export default NotAuthorised;
