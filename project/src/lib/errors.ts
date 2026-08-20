/**
 * Extracts a human-readable message from a caught error, whether it's a
 * native `Error` or a plain error-like object (e.g. Supabase's
 * `PostgrestError`, which is never an `Error` instance).
 */
export function getErrorMessage(err: unknown, fallback = 'Erreur'): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}
