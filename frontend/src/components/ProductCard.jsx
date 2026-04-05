import { MapPin, User, Calendar, Hash, ArrowRight, Leaf, Award } from 'lucide-react';

function formatDate(dateString) {
  if (!dateString) return null;
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

const typeColors = {
  Vegetables: 'bg-green-100 text-green-700',
  Fruits: 'bg-orange-100 text-orange-700',
  Grains: 'bg-yellow-100 text-yellow-700',
  Dairy: 'bg-blue-100 text-blue-700',
  Meat: 'bg-red-100 text-red-700',
  Other: 'bg-gray-100 text-gray-600',
};

export default function ProductCard({ product, onClick }) {
  if (!product) return null;

  const typeColor = typeColors[product.product_type] || typeColors.Other;

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl border border-gray-100 shadow-sm
        hover:shadow-md hover:-translate-y-1 hover:border-green-200
        transition-all duration-200 cursor-pointer overflow-hidden group
        flex flex-col
      `}
    >
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-400 w-0 group-hover:w-full transition-all duration-300" />

      <div className="p-5 flex-1 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 truncate group-hover:text-green-700 transition-colors">
              {product.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              <Hash className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500 font-mono">{product.batch_number}</span>
            </div>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold flex-shrink-0 ${typeColor}`}>
            {product.product_type}
          </span>
        </div>

        {/* Badges */}
        {(product.is_organic || product.is_certified) && (
          <div className="flex items-center gap-2 flex-wrap">
            {product.is_organic && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                <Leaf className="w-3 h-3" />
                Organic
              </span>
            )}
            {product.is_certified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <Award className="w-3 h-3" />
                Certified
              </span>
            )}
          </div>
        )}

        {/* Details */}
        <div className="space-y-1.5 flex-1">
          {product.farmer_name && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">{product.farmer_name}</span>
            </div>
          )}
          {product.farm_location && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">{product.farm_location}</span>
            </div>
          )}
          {product.harvest_date && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span>Harvested {formatDate(product.harvest_date)}</span>
            </div>
          )}
        </div>

        {/* Track button */}
        <button
          onClick={onClick}
          className="mt-2 w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 hover:text-green-800 transition-all duration-150 group-hover:bg-green-600 group-hover:text-white group-hover:border-green-600"
        >
          Track Product
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
