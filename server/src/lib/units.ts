// server/src/lib/units.ts

/**
 * Converts a quantity written in one unit into the unit an item is stocked in.
 *
 * Without this, a shopping line entered as "500 g" of an item stocked in
 * kilograms would add 500 kg to the store room — the number would be taken at
 * face value and the stock valuation would be out by a factor of a thousand.
 */
const TO_BASE: Record<string, { base: string; factor: number }> = {
  kg: { base: "kg", factor: 1 },
  g: { base: "kg", factor: 0.001 },
  litre: { base: "litre", factor: 1 },
  ml: { base: "litre", factor: 0.001 },
  piece: { base: "piece", factor: 1 },
  dozen: { base: "piece", factor: 12 },
  packet: { base: "packet", factor: 1 },
  bundle: { base: "bundle", factor: 1 },
};

/** Units a line may be written in, given how the item itself is stocked. */
export function compatibleUnits(itemUnit: string): string[] {
  const base = TO_BASE[itemUnit]?.base;
  if (!base) return [itemUnit];
  return Object.entries(TO_BASE)
    .filter(([, v]) => v.base === base)
    .map(([u]) => u);
}

export function convertQty(qty: number, fromUnit: string, toUnit: string): number {
  if (!fromUnit || fromUnit === toUnit) return qty;

  const from = TO_BASE[fromUnit];
  const to = TO_BASE[toUnit];

  // Unrelated units (packets into litres) have no sensible ratio, so the
  // number is left alone rather than silently invented.
  if (!from || !to || from.base !== to.base) return qty;

  return (qty * from.factor) / to.factor;
}

export const unitsAreCompatible = (a: string, b: string): boolean =>
  !a || !b || a === b || TO_BASE[a]?.base === TO_BASE[b]?.base;