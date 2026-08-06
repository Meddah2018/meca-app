/**
 * Computes the delivery date based on Algeria's work week (Sun–Thu).
 * Selection before 12:00 → same day; after 12:00 → next working day.
 * Fri & Sat are not working days.
 */
export function computeDeliveryDate(selectedAt: Date): Date {
  const hour = selectedAt.getHours();
  const beforeNoon = hour < 12;

  if (beforeNoon) return selectedAt;

  // Advance to next working day (Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6)
  const next = new Date(selectedAt);
  next.setDate(next.getDate() + 1);
  while (next.getDay() === 5 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

export function formatDeliveryDate(date: Date): string {
  return date.toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long' });
}
