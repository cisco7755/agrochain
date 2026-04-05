import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Thermometer, Droplets } from 'lucide-react';

function formatLabel(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-gray-700 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-semibold">{p.value}{p.name === 'Temp (°C)' ? '°C' : '% RH'}</span>
        </div>
      ))}
    </div>
  );
};

export default function ColdChainChart({ events }) {
  const data = events
    .filter((e) => e.temperature != null || e.humidity != null)
    .map((e) => ({
      name: `${e.event_type} · ${formatLabel(e.timestamp)}`,
      temp: e.temperature,
      humidity: e.humidity,
      event: e.event_type,
    }));

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-sm">
        <Thermometer className="w-10 h-10 mb-2 text-gray-300" />
        No temperature or humidity data available for this product
      </div>
    );
  }

  const hasTemp = data.some((d) => d.temp != null);
  const hasHumidity = data.some((d) => d.humidity != null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-xs font-semibold text-gray-500">
        {hasTemp && (
          <div className="flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-red-400" />
            <span>Temperature (°C)</span>
            <span className="text-gray-400 font-normal">· Cold chain threshold: 0–8°C</span>
          </div>
        )}
        {hasHumidity && (
          <div className="flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-blue-400" />
            <span>Humidity (% RH)</span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            angle={-30}
            textAnchor="end"
            interval={0}
            height={60}
          />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          {/* Safe cold-chain zone reference */}
          {hasTemp && (
            <>
              <ReferenceLine y={8} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '8°C limit', fontSize: 10, fill: '#d97706' }} />
              <ReferenceLine y={0} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: '0°C', fontSize: 10, fill: '#2563eb' }} />
            </>
          )}
          {hasTemp && (
            <Line type="monotone" dataKey="temp" name="Temp (°C)" stroke="#ef4444"
              strokeWidth={2} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} connectNulls />
          )}
          {hasHumidity && (
            <Line type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#3b82f6"
              strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} connectNulls />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
