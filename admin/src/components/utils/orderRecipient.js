const GUEST_PREFIX = "Guest - ";

export function orderRecipientName(order) {
  const name = order?.clientName || "";
  return name.startsWith(GUEST_PREFIX) ? name.slice(GUEST_PREFIX.length) : name;
}