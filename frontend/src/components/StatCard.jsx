import { useEffect, useRef, useState } from 'react';

const colorMap = {
  green: {
    bg: 'bg-green-50',
    border: 'border-green-100',
    iconBg: 'bg-green-600',
    iconText: 'text-white',
    valuText: 'text-green-800',
    subtitle: 'text-green-600',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    iconBg: 'bg-blue-600',
    iconText: 'text-white',
    valuText: 'text-blue-800',
    subtitle: 'text-blue-600',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    iconBg: 'bg-amber-500',
    iconText: 'text-white',
    valuText: 'text-amber-800',
    subtitle: 'text-amber-600',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    iconBg: 'bg-purple-600',
    iconText: 'text-white',
    valuText: 'text-purple-800',
    subtitle: 'text-purple-600',
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    iconBg: 'bg-emerald-600',
    iconText: 'text-white',
    valuText: 'text-emerald-800',
    subtitle: 'text-emerald-600',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-100',
    iconBg: 'bg-red-600',
    iconText: 'text-white',
    valuText: 'text-red-800',
    subtitle: 'text-red-600',
  },
};

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const num = parseInt(value) || 0;
    if (num === 0) { setDisplay(0); return; }
    const duration = 800;
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * num));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);

  return <span>{typeof value === 'string' && isNaN(value) ? value : display.toLocaleString()}</span>;
}

export default function StatCard({ title, value, icon: Icon, color = 'green', subtitle }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  const colors = colorMap[color] || colorMap.green;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`
        ${colors.bg} ${colors.border}
        border rounded-xl p-5 flex items-start gap-4
        transition-all duration-300 hover:shadow-md hover:-translate-y-0.5
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      style={{ transition: 'opacity 0.4s ease, transform 0.4s ease, box-shadow 0.2s ease' }}
    >
      <div className={`${colors.iconBg} ${colors.iconText} w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
        {Icon && <Icon className="w-6 h-6" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{title}</p>
        <p className={`text-3xl font-bold ${colors.valuText} leading-none`}>
          <AnimatedNumber value={value} />
        </p>
        {subtitle && (
          <p className={`text-xs mt-1.5 font-medium ${colors.subtitle}`}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}
