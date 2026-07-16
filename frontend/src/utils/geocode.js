// Photon (https://photon.komoot.io) — open-source geocoder (Apache 2.0) built on
// OpenStreetMap data by komoot. No API key required. Used for both forward search
// (autocomplete suggestions) and reverse geocoding (current-location lookup).
const PHOTON_BASE = 'https://photon.komoot.io';

function formatFeatureLabel(properties) {
  const { name, city, state, country } = properties;
  const parts = [name, city && city !== name ? city : null, state && state !== city ? state : null, country]
    .filter(Boolean);
  // Collapse accidental consecutive duplicates (e.g. name === city for a city-level result).
  return parts.filter((part, i) => part !== parts[i - 1]).join(', ');
}

async function fetchPhoton(path, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${PHOTON_BASE}${path}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Photon returned ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Forward geocoding — search-as-you-type location suggestions.
export async function searchPlaces(query, limit = 5) {
  if (!query || query.trim().length < 3) return [];
  const data = await fetchPhoton(`/api?q=${encodeURIComponent(query)}&limit=${limit}`);
  return (data.features || [])
    .map((f) => ({
      label: formatFeatureLabel(f.properties),
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
    }))
    .filter((r) => r.label);
}

// Reverse geocoding — coordinates to a human-readable place label.
export async function reverseGeocode(lat, lon) {
  const data = await fetchPhoton(`/reverse?lat=${lat}&lon=${lon}`);
  const feature = data.features?.[0];
  if (!feature) throw new Error('No address found for these coordinates');
  const label = formatFeatureLabel(feature.properties);
  if (!label) throw new Error('Empty address label');
  return label;
}
