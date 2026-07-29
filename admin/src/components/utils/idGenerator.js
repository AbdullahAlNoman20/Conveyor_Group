/** Generates a readable, prefixed, collision-resistant ID for mock/local data.
 * e.g. genId("ORD") -> "ORD-2A9F3-73D1" */
export function genId(prefix = "ID") {
  const rand = () => Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${rand()}`;
}

export function genInvoiceNumber() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  return `INV-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function genTokenNumber(seq) {
  return `T-${String(seq).padStart(3, "0")}`;
}
