// Compact offline city dataset used as a fallback when the Nominatim reverse-geocoding
// request fails (offline, rate-limited, blocked). Nearest match by great-circle distance.
const CITIES = [
  { name: 'Nairobi', country: 'Kenya', lat: -1.2921, lon: 36.8219 },
  { name: 'Mombasa', country: 'Kenya', lat: -4.0435, lon: 39.6682 },
  { name: 'Kisumu', country: 'Kenya', lat: -0.0917, lon: 34.7680 },
  { name: 'Nakuru', country: 'Kenya', lat: -0.3031, lon: 36.0800 },
  { name: 'Kampala', country: 'Uganda', lat: 0.3476, lon: 32.5825 },
  { name: 'Entebbe', country: 'Uganda', lat: 0.0512, lon: 32.4637 },
  { name: 'Dar es Salaam', country: 'Tanzania', lat: -6.7924, lon: 39.2083 },
  { name: 'Dodoma', country: 'Tanzania', lat: -6.1630, lon: 35.7516 },
  { name: 'Kigali', country: 'Rwanda', lat: -1.9403, lon: 29.8739 },
  { name: 'Addis Ababa', country: 'Ethiopia', lat: 9.0300, lon: 38.7400 },
  { name: 'Mogadishu', country: 'Somalia', lat: 2.0469, lon: 45.3182 },
  { name: 'Juba', country: 'South Sudan', lat: 4.8517, lon: 31.5825 },
  { name: 'Khartoum', country: 'Sudan', lat: 15.5007, lon: 32.5599 },
  { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lon: 3.3792 },
  { name: 'Abuja', country: 'Nigeria', lat: 9.0765, lon: 7.3986 },
  { name: 'Kano', country: 'Nigeria', lat: 12.0022, lon: 8.5920 },
  { name: 'Accra', country: 'Ghana', lat: 5.6037, lon: -0.1870 },
  { name: 'Abidjan', country: "Cote d'Ivoire", lat: 5.3600, lon: -4.0083 },
  { name: 'Dakar', country: 'Senegal', lat: 14.7167, lon: -17.4677 },
  { name: 'Bamako', country: 'Mali', lat: 12.6392, lon: -8.0029 },
  { name: 'Yaounde', country: 'Cameroon', lat: 3.8480, lon: 11.5021 },
  { name: 'Douala', country: 'Cameroon', lat: 4.0511, lon: 9.7679 },
  { name: 'Kinshasa', country: 'DR Congo', lat: -4.4419, lon: 15.2663 },
  { name: 'Lubumbashi', country: 'DR Congo', lat: -11.6609, lon: 27.4794 },
  { name: 'Luanda', country: 'Angola', lat: -8.8390, lon: 13.2894 },
  { name: 'Lusaka', country: 'Zambia', lat: -15.3875, lon: 28.3228 },
  { name: 'Harare', country: 'Zimbabwe', lat: -17.8252, lon: 31.0335 },
  { name: 'Gaborone', country: 'Botswana', lat: -24.6282, lon: 25.9231 },
  { name: 'Windhoek', country: 'Namibia', lat: -22.5609, lon: 17.0658 },
  { name: 'Johannesburg', country: 'South Africa', lat: -26.2041, lon: 28.0473 },
  { name: 'Cape Town', country: 'South Africa', lat: -33.9249, lon: 18.4241 },
  { name: 'Durban', country: 'South Africa', lat: -29.8587, lon: 31.0218 },
  { name: 'Maputo', country: 'Mozambique', lat: -25.9692, lon: 32.5732 },
  { name: 'Antananarivo', country: 'Madagascar', lat: -18.8792, lon: 47.5079 },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lon: 31.2357 },
  { name: 'Casablanca', country: 'Morocco', lat: 33.5731, lon: -7.5898 },
  { name: 'Tunis', country: 'Tunisia', lat: 36.8065, lon: 10.1815 },
  { name: 'Algiers', country: 'Algeria', lat: 36.7538, lon: 3.0588 },
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
  { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 },
  { name: 'Berlin', country: 'Germany', lat: 52.5200, lon: 13.4050 },
  { name: 'Madrid', country: 'Spain', lat: 40.4168, lon: -3.7038 },
  { name: 'Rome', country: 'Italy', lat: 41.9028, lon: 12.4964 },
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lon: 4.9041 },
  { name: 'Lisbon', country: 'Portugal', lat: 38.7223, lon: -9.1393 },
  { name: 'Dubai', country: 'UAE', lat: 25.2048, lon: 55.2708 },
  { name: 'Riyadh', country: 'Saudi Arabia', lat: 24.7136, lon: 46.6753 },
  { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lon: 28.9784 },
  { name: 'Mumbai', country: 'India', lat: 19.0760, lon: 72.8777 },
  { name: 'New Delhi', country: 'India', lat: 28.6139, lon: 77.2090 },
  { name: 'Beijing', country: 'China', lat: 39.9042, lon: 116.4074 },
  { name: 'Shanghai', country: 'China', lat: 31.2304, lon: 121.4737 },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lon: 103.8198 },
  { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lon: 100.5018 },
  { name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lon: 106.8456 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093 },
  { name: 'New York', country: 'United States', lat: 40.7128, lon: -74.0060 },
  { name: 'Los Angeles', country: 'United States', lat: 34.0522, lon: -118.2437 },
  { name: 'Chicago', country: 'United States', lat: 41.8781, lon: -87.6298 },
  { name: 'Houston', country: 'United States', lat: 29.7604, lon: -95.3698 },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lon: -79.3832 },
  { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lon: -99.1332 },
  { name: 'Sao Paulo', country: 'Brazil', lat: -23.5505, lon: -46.6333 },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lon: -58.3816 },
  { name: 'Lima', country: 'Peru', lat: -12.0464, lon: -77.0428 },
  { name: 'Bogota', country: 'Colombia', lat: 4.7110, lon: -74.0721 },
];

const toRad = (deg) => (deg * Math.PI) / 180;

// Great-circle (haversine) distance between two lat/lon points, in kilometers.
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Offline nearest-city lookup — no network required. Returns null if the
// nearest known city is implausibly far away (> 300km), since a rough label
// is worse than none at that distance.
export function nearestCityLabel(lat, lon) {
  let best = null;
  let bestDist = Infinity;
  for (const city of CITIES) {
    const dist = haversineDistanceKm(lat, lon, city.lat, city.lon);
    if (dist < bestDist) {
      bestDist = dist;
      best = city;
    }
  }
  if (!best || bestDist > 300) return null;
  const prefix = bestDist > 15 ? 'Near ' : '';
  return `${prefix}${best.name}, ${best.country}`;
}
