// Safe transit ranges by product type — matches Register.jsx's PRODUCT_TYPES.
// null = no defined cold-chain requirement for that field (shelf-stable, or
// too product-specific to give a single number), so no violation is ever
// flagged for it.
const THRESHOLDS = {
  Vegetables: { tempMin: 0, tempMax: 4, humidityMin: 85, humidityMax: 95 },
  Fruits:     { tempMin: 0, tempMax: 8, humidityMin: 85, humidityMax: 95 },
  Dairy:      { tempMin: 0, tempMax: 4, humidityMin: null, humidityMax: null },
  Meat:       { tempMin: -2, tempMax: 4, humidityMin: null, humidityMax: null },
  Grains:     { tempMin: null, tempMax: null, humidityMin: null, humidityMax: null },
  Other:      { tempMin: null, tempMax: null, humidityMin: null, humidityMax: null },
};

export function getColdChainRange(productType) {
  return THRESHOLDS[productType] || THRESHOLDS.Other;
}

// Returns null if not a violation, otherwise a short human-readable reason.
export function checkColdChainViolation(productType, temperature, humidity) {
  const range = getColdChainRange(productType);
  const reasons = [];

  if (temperature != null && temperature !== '' && !Number.isNaN(Number(temperature))) {
    const t = Number(temperature);
    if (range.tempMin != null && t < range.tempMin) reasons.push(`${t}°C is below the safe minimum of ${range.tempMin}°C`);
    if (range.tempMax != null && t > range.tempMax) reasons.push(`${t}°C exceeds the safe maximum of ${range.tempMax}°C`);
  }
  if (humidity != null && humidity !== '' && !Number.isNaN(Number(humidity))) {
    const h = Number(humidity);
    if (range.humidityMin != null && h < range.humidityMin) reasons.push(`${h}% humidity is below the safe minimum of ${range.humidityMin}%`);
    if (range.humidityMax != null && h > range.humidityMax) reasons.push(`${h}% humidity exceeds the safe maximum of ${range.humidityMax}%`);
  }

  return reasons.length > 0 ? reasons.join('; ') : null;
}

export function formatColdChainRange(productType) {
  const range = getColdChainRange(productType);
  if (range.tempMin == null && range.tempMax == null) return null;
  return `${range.tempMin}–${range.tempMax}°C`;
}
