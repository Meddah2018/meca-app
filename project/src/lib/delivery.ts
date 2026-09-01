/**
 * Delivery date display helper.
 *
 * The delivery date itself is computed server-side by the select_offer() RPC
 * (Algeria work week Sat–Thu, Friday off, noon cutoff) and stored on the order;
 * the client only formats the stored value.
 */
export function formatDeliveryDate(date: Date): string {
  return date.toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long' });
}
