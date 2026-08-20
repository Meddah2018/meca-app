/**
 * Sets/clears the native badge on the app's home-screen icon (Web Badging
 * API). Only works for an installed PWA on Android/Chrome and desktop
 * Chrome/Edge — iOS Safari has no implementation, and the API silently
 * no-ops there and in any browser that doesn't support it.
 */
export function updateAppBadge(count: number): void {
  const nav = navigator as Navigator & {
    setAppBadge?: (count?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (count > 0) {
      nav.setAppBadge?.(count)?.catch(() => {});
    } else {
      nav.clearAppBadge?.()?.catch(() => {});
    }
  } catch {
    // Badging API unsupported — no-op.
  }
}
