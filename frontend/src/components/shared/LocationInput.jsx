import { useState, useRef, useEffect } from 'react';
import { MapPin, LocateFixed, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { searchPlaces, reverseGeocode } from '../../utils/geocode';
import { nearestCityLabel } from '../../utils/geoUtils';

// Text input with location autocomplete suggestions (Photon/OSM) and a
// "use current location" button with an offline fallback chain.
export default function LocationInput({ value, onChange, placeholder, required, className = '' }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const text = e.target.value;
    onChange(text);
    setHighlighted(-1);
    clearTimeout(debounceRef.current);
    if (text.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchPlaces(text);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const selectSuggestion = (label) => {
    onChange(label);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[highlighted].label);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const detectCurrentLocation = (isRetry = false) => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const label = await reverseGeocode(latitude, longitude);
          onChange(label);
          toast.success('Location detected');
        } catch {
          const offlineLabel = nearestCityLabel(latitude, longitude);
          onChange(offlineLabel || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          toast.error(offlineLabel
            ? `Reverse geocoding unavailable — using nearest known city (${offlineLabel})`
            : 'Could not resolve address, using coordinates instead');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        // POSITION_UNAVAILABLE (e.g. macOS CoreLocation kCLErrorLocationUnknown) is
        // often transient on desktops without GPS — retry once at lower accuracy.
        if (err.code === err.POSITION_UNAVAILABLE && !isRetry) {
          detectCurrentLocation(true);
          return;
        }
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Location permission denied — enable it in your browser/System Settings');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          toast.error('Location unavailable — check that Location Services & Wi-Fi are on, then try again');
        } else {
          toast.error('Could not get your location');
        }
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={placeholder}
            required={required}
            autoComplete="off"
            className={className || 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition placeholder-gray-400'}
          />
          {searching && (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
          )}
        </div>
        <button
          type="button"
          onClick={() => detectCurrentLocation(false)}
          disabled={locating}
          title="Use current location"
          className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 rounded-lg border border-emerald-100 transition whitespace-nowrap"
        >
          {locating
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <LocateFixed className="w-4 h-4" />}
          <span className="hidden sm:inline">{locating ? 'Locating…' : 'Use current location'}</span>
        </button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-auto">
          {suggestions.map((s, i) => (
            <li key={`${s.label}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(s.label)}
                className={`w-full flex items-center gap-2 text-left px-3 py-2 text-sm transition ${
                  i === highlighted ? 'bg-emerald-50 text-emerald-800' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="truncate">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
