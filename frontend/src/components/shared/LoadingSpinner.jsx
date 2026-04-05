const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
    <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4" />
    <p className="text-gray-600 text-sm">{message}</p>
  </div>
);

export default LoadingSpinner;
