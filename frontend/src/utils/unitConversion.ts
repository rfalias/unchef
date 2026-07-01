function parseAmount(s: string | null): number | null {
  if (!s) return null;
  s = s.trim();
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1]) / parseInt(frac[2]);
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function formatAmount(n: number): string {
  if (n < 1) return parseFloat(n.toFixed(1)).toString();
  if (n < 10) return parseFloat(n.toFixed(1)).toString();
  return Math.round(n).toString();
}

const CONVERSIONS: Record<string, { factor: number; toUnit: string }> = {
  tsp:            { factor: 5,   toUnit: "ml" },
  teaspoon:       { factor: 5,   toUnit: "ml" },
  teaspoons:      { factor: 5,   toUnit: "ml" },
  tbsp:           { factor: 15,  toUnit: "ml" },
  tbs:            { factor: 15,  toUnit: "ml" },
  tablespoon:     { factor: 15,  toUnit: "ml" },
  tablespoons:    { factor: 15,  toUnit: "ml" },
  cup:            { factor: 240, toUnit: "ml" },
  cups:           { factor: 240, toUnit: "ml" },
  c:              { factor: 240, toUnit: "ml" },
  "fl oz":        { factor: 30,  toUnit: "ml" },
  "fluid ounce":  { factor: 30,  toUnit: "ml" },
  "fluid ounces": { factor: 30,  toUnit: "ml" },
  oz:             { factor: 28,  toUnit: "g" },
  ounce:          { factor: 28,  toUnit: "g" },
  ounces:         { factor: 28,  toUnit: "g" },
  lb:             { factor: 454, toUnit: "g" },
  lbs:            { factor: 454, toUnit: "g" },
  pound:          { factor: 454, toUnit: "g" },
  pounds:         { factor: 454, toUnit: "g" },
};

export function convertToMetric(
  amount: string | null,
  unit: string | null,
): { amount: string | null; unit: string | null } {
  if (!amount || !unit) return { amount, unit };
  const key = unit.toLowerCase().trim();
  const conv = CONVERSIONS[key];
  if (!conv) return { amount, unit };

  const n = parseAmount(amount);
  if (n === null) return { amount, unit };

  let converted = n * conv.factor;
  let resultUnit = conv.toUnit;

  if (resultUnit === "ml" && converted >= 1000) {
    converted /= 1000;
    resultUnit = "l";
  } else if (resultUnit === "g" && converted >= 1000) {
    converted /= 1000;
    resultUnit = "kg";
  }

  return { amount: formatAmount(converted), unit: resultUnit };
}
