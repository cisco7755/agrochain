import { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

const EVENT_COLORS = {
  HARVESTED: '#16a34a', PROCESSED: '#2563eb', PACKAGED: '#7c3aed',
  SHIPPED: '#d97706', RECEIVED: '#059669', CERTIFIED: '#ca8a04',
  SOLD: '#9333ea', REGISTERED: '#6b7280',
};

export default function SupplyChainMap({ events, product }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const points = [];

  if (product?.farm_lat && product?.farm_lng) {
    points.push({
      lat: product.farm_lat, lng: product.farm_lng,
      label: `Farm: ${product.farm_location || 'Origin'}`,
      event_type: 'HARVESTED', actor: product.farmer_name,
    });
  }

  events.forEach((e) => {
    if (e.location_lat && e.location_lng) {
      points.push({
        lat: e.location_lat, lng: e.location_lng,
        label: `${e.event_type}: ${e.location}`,
        event_type: e.event_type, actor: e.actor_name,
      });
    }
  });

  useEffect(() => {
    if (!mapRef.current || points.length === 0) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    import('leaflet').then((L) => {
      import('leaflet/dist/leaflet.css');

      // Fix default icon
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false });
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      const latlngs = [];

      points.forEach((pt, i) => {
        const color = EVENT_COLORS[pt.event_type] || '#6b7280';
        const circleMarker = L.circleMarker([pt.lat, pt.lng], {
          radius: 10,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map);

        circleMarker.bindPopup(`
          <div style="font-family:system-ui;min-width:150px">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px">${pt.event_type}</div>
            <div style="font-size:11px;color:#6b7280">${pt.label}</div>
            <div style="font-size:11px;color:#374151;margin-top:2px">👤 ${pt.actor || '—'}</div>
          </div>
        `);

        // Step number label
        L.marker([pt.lat, pt.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="
              background:${color};color:white;width:18px;height:18px;
              border-radius:50%;display:flex;align-items:center;justify-content:center;
              font-size:10px;font-weight:700;margin-left:1px;margin-top:1px;
              border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)
            ">${i + 1}</div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          }),
        }).addTo(map);

        latlngs.push([pt.lat, pt.lng]);
      });

      // Draw route line
      if (latlngs.length > 1) {
        L.polyline(latlngs, { color: '#16a34a', weight: 2.5, dashArray: '6,4', opacity: 0.7 }).addTo(map);
      }

      if (latlngs.length > 0) {
        map.fitBounds(latlngs.length === 1 ? [[latlngs[0][0] - 0.5, latlngs[0][1] - 0.5], [latlngs[0][0] + 0.5, latlngs[0][1] + 0.5]] : latlngs, { padding: [30, 30] });
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [events, product]);

  if (points.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-sm">
        <MapPin className="w-10 h-10 mb-2 text-gray-300" />
        No location coordinates available for map visualization
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        {points.map((p, i) => (
          <span key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
            <span className="w-4 h-4 rounded-full text-white flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: EVENT_COLORS[p.event_type] || '#6b7280' }}>{i + 1}</span>
            {p.event_type}
          </span>
        ))}
      </div>
      <div ref={mapRef} className="w-full h-72 rounded-xl overflow-hidden border border-gray-200 z-0" />
    </div>
  );
}
