export interface NavigationTelemetryEvent {
  feature_opened: string;
  source_page: string;
  tap_count: number;
  time_to_feature_ms: number;
  at: string;
}

const LAST_INTERACTION_KEY = 'nav:last_interaction_at';

const safeNow = (): number => Date.now();

export const markNavigationInteraction = (): void => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(LAST_INTERACTION_KEY, String(safeNow()));
};

const computeTimeToFeature = (): number => {
  if (typeof window === 'undefined') return 0;
  const raw = window.sessionStorage.getItem(LAST_INTERACTION_KEY);
  const last = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(last)) return 0;
  return Math.max(0, safeNow() - last);
};

export const trackFeatureOpened = (featureOpened: string, sourcePage: string, tapCount: number = 1): void => {
  if (typeof window === 'undefined') return;

  const timeToFeatureMs = computeTimeToFeature();
  markNavigationInteraction();

  const payload: NavigationTelemetryEvent = {
    feature_opened: featureOpened,
    source_page: sourcePage,
    tap_count: tapCount,
    time_to_feature_ms: timeToFeatureMs,
    at: new Date().toISOString(),
  };

  window.dispatchEvent(new CustomEvent('app:feature_opened', { detail: payload }));

  const endpoint = process.env.NEXT_PUBLIC_NAV_TELEMETRY_URL;
  if (endpoint && navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    navigator.sendBeacon(endpoint, blob);
  }
}
