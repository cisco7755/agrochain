import {
  Sprout,
  Factory,
  Package,
  Truck,
  CheckCircle,
  Award,
  ShoppingCart,
  CircleDot,
  Thermometer,
  Droplets,
  MapPin,
  User,
  FileText,
  Hash,
} from 'lucide-react';

const EVENT_CONFIG = {
  HARVESTED: {
    icon: Sprout,
    label: 'Harvested',
    color: 'text-green-700',
    bg: 'bg-green-100',
    border: 'border-green-200',
    dot: 'bg-green-600',
    badge: 'bg-green-100 text-green-800',
  },
  PROCESSED: {
    icon: Factory,
    label: 'Processed',
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    border: 'border-blue-200',
    dot: 'bg-blue-600',
    badge: 'bg-blue-100 text-blue-800',
  },
  PACKAGED: {
    icon: Package,
    label: 'Packaged',
    color: 'text-indigo-700',
    bg: 'bg-indigo-100',
    border: 'border-indigo-200',
    dot: 'bg-indigo-600',
    badge: 'bg-indigo-100 text-indigo-800',
  },
  SHIPPED: {
    icon: Truck,
    label: 'Shipped',
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800',
  },
  RECEIVED: {
    icon: CheckCircle,
    label: 'Received',
    color: 'text-emerald-700',
    bg: 'bg-emerald-100',
    border: 'border-emerald-200',
    dot: 'bg-emerald-600',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  CERTIFIED: {
    icon: Award,
    label: 'Certified',
    color: 'text-yellow-700',
    bg: 'bg-yellow-100',
    border: 'border-yellow-200',
    dot: 'bg-yellow-500',
    badge: 'bg-yellow-100 text-yellow-800',
  },
  SOLD: {
    icon: ShoppingCart,
    label: 'Sold',
    color: 'text-purple-700',
    bg: 'bg-purple-100',
    border: 'border-purple-200',
    dot: 'bg-purple-600',
    badge: 'bg-purple-100 text-purple-800',
  },
  REGISTERED: {
    icon: CircleDot,
    label: 'Registered',
    color: 'text-gray-700',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    dot: 'bg-gray-500',
    badge: 'bg-gray-100 text-gray-700',
  },
};

function formatDate(dateString) {
  if (!dateString) return 'Unknown date';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

function truncateHash(hash) {
  if (!hash) return null;
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export default function Timeline({ events }) {
  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CircleDot className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">No supply chain events yet</p>
        <p className="text-gray-400 text-sm mt-1">Events will appear here as the product moves through the supply chain</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gradient-to-b from-green-400 via-green-300 to-green-100" />

      <div className="space-y-6">
        {events.map((event, index) => {
          const config = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.REGISTERED;
          const Icon = config.icon;

          return (
            <div
              key={event.id || index}
              className="relative flex gap-4 animate-fade-in"
              style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
            >
              {/* Dot + Icon */}
              <div className="relative z-10 flex-shrink-0">
                <div className={`w-10 h-10 rounded-full ${config.bg} ${config.border} border-2 flex items-center justify-center shadow-sm`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.badge}`}>
                      {config.label}
                    </span>
                    {event.actor_role && (
                      <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                        {event.actor_role}
                      </span>
                    )}
                  </div>
                  <time className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                    {formatDate(event.timestamp || event.created_at)}
                  </time>
                </div>

                {/* Body */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {event.actor_name && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="font-medium">{event.actor_name}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {event.temperature != null && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Thermometer className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span>{event.temperature}°C</span>
                    </div>
                  )}
                  {event.humidity != null && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Droplets className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <span>{event.humidity}% RH</span>
                    </div>
                  )}
                </div>

                {event.notes && (
                  <div className="mt-3 flex items-start gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="italic">{event.notes}</span>
                  </div>
                )}

                {event.tx_hash && (
                  <div className="mt-3 flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="font-mono text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded break-all">
                      {truncateHash(event.tx_hash)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
