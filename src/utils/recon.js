export function calculateRecon({ mg, water, dose }) {
  const mgNum = Number(mg) || 0
  const waterMl = Number(water) || 0
  const doseMcg = Number(dose) || 0
  if (mgNum <= 0 || waterMl <= 0 || doseMcg <= 0) return { unitsPerDose: 0, dosesPerVial: 0, concentration: 0 }
  // Assume 1 mL = 100 insulin units
  const totalMcg = mgNum * 1000
  const concentration = totalMcg / waterMl // mcg per mL
  const unitsPerDose = (doseMcg / concentration) * 100 // convert mL to insulin units
  const dosesPerVial = Math.floor(totalMcg / doseMcg)
  return { unitsPerDose, dosesPerVial, concentration }
}

export function getChromeGradient(hex) {
    if (!hex || !hex.startsWith('#') || hex.length < 7) return `radial-gradient(circle, #9ca3af, #6b7280)`; // A safe gray default
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lighter = `rgb(${Math.min(255, r + 100)}, ${Math.min(255, g + 100)}, ${Math.min(255, b + 100)})`;
    return `radial-gradient(circle at 25% 25%, ${lighter}, ${hex})`;
}

export function isColorDark(hex) {
    if (!hex || !hex.startsWith('#')) return false;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // Formula for luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
}


