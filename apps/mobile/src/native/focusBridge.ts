export type FocusSessionState = 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface FocusBridgeSession {
  sessionId: string;
  taskId: string;
  taskTitle?: string;
  plannedDurationMinutes: number;
  remainingSeconds?: number;
  status?: FocusSessionState;
}

export interface FocusBridgeAuth {
  accessToken: string;
  deviceId: string;
}

export interface FocusBridge {
  start: (session: FocusBridgeSession, auth: FocusBridgeAuth) => Promise<void>;
  update: (session: Pick<FocusBridgeSession, 'sessionId' | 'remainingSeconds'>, auth: FocusBridgeAuth) => Promise<void>;
  pause: (sessionId: string, auth: FocusBridgeAuth) => Promise<void>;
  resume: (sessionId: string, auth: FocusBridgeAuth) => Promise<void>;
  stop: (sessionId: string, auth: FocusBridgeAuth, outcome?: 'COMPLETED' | 'CANCELLED') => Promise<void>;
  isSupported: () => boolean;
}

// ─── Native Module Imports (Expo Modules) ───────────────────────────────────────

interface NativeLiveActivityModule {
  isSupported: () => boolean;
  startActivity: (params: Record<string, unknown>) => Promise<void>;
  updateActivity: (params: Record<string, unknown>) => Promise<void>;
  endActivity: (params?: Record<string, unknown>) => Promise<void>;
}

interface NativeWidgetModule {
  isSupported: () => boolean;
  updateWidget: (params: Record<string, unknown>) => void;
  clearWidget: () => void;
}

let liveActivityModule: NativeLiveActivityModule | null = null;
let widgetModule: NativeWidgetModule | null = null;

try {
  // Dynamic require for Expo native modules — only available in native runtime
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { requireNativeModule } = require('expo-modules-core');
  try {
    liveActivityModule = requireNativeModule('FocusLiveActivity') as NativeLiveActivityModule;
  } catch { /* iOS module not available */ }
  try {
    widgetModule = requireNativeModule('FocusWidget') as NativeWidgetModule;
  } catch { /* Android module not available */ }
} catch {
  // Not in an Expo environment — fall through to HTTP
}

const ANALYTICS_SERVICE_URL =
  process.env.EXPO_PUBLIC_ANALYTICS_SERVICE_URL ||
  process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_URL ||
  'http://localhost:4003';

const request = async (
  path: string,
  auth: FocusBridgeAuth,
  body?: Record<string, unknown>,
  method: 'POST' | 'PATCH' = 'PATCH',
): Promise<void> => {
  const response = await fetch(`${ANALYTICS_SERVICE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.accessToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`focusBridge request failed (${response.status}): ${text || 'unknown error'}`);
  }
};

// ─── Helpers for native UI ──────────────────────────────────────────────────────

function updateNativeUI(params: {
  taskTitle?: string;
  plannedDurationMinutes?: number;
  elapsedSeconds: number;
  isPaused: boolean;
  sessionType?: string;
}): void {
  // iOS Live Activity
  if (liveActivityModule) {
    liveActivityModule.updateActivity({
      elapsedSeconds: params.elapsedSeconds,
      isPaused: params.isPaused,
      breakNumber: 0,
      sessionType: params.sessionType ?? 'POMODORO',
    }).catch(() => {});
  }

  // Android Widget
  if (widgetModule) {
    widgetModule.updateWidget({
      taskTitle: params.taskTitle ?? 'Focus Session',
      elapsedSeconds: params.elapsedSeconds,
      plannedDurationMinutes: params.plannedDurationMinutes ?? 25,
      isPaused: params.isPaused,
      sessionType: params.sessionType ?? 'POMODORO',
    });
  }
}

function clearNativeUI(): void {
  if (liveActivityModule) {
    liveActivityModule.endActivity().catch(() => {});
  }
  if (widgetModule) {
    widgetModule.clearWidget();
  }
}

// ─── Bridge Implementation ──────────────────────────────────────────────────────

export const focusBridge: FocusBridge = {
  isSupported: () => {
    if (liveActivityModule?.isSupported()) return true;
    if (widgetModule?.isSupported()) return true;
    return false;
  },

  start: async (session, auth) => {
    // Start native UI (iOS Live Activity + Android Widget)
    if (liveActivityModule) {
      try {
        await liveActivityModule.startActivity({
          sessionId: session.sessionId,
          taskTitle: session.taskTitle ?? 'Focus Session',
          plannedDurationMinutes: session.plannedDurationMinutes,
          sessionType: 'POMODORO',
        });
      } catch (err) {
        console.warn('[FocusBridge] Live Activity start failed:', err);
      }
    }

    if (widgetModule) {
      widgetModule.updateWidget({
        taskTitle: session.taskTitle ?? 'Focus Session',
        elapsedSeconds: 0,
        plannedDurationMinutes: session.plannedDurationMinutes,
        isPaused: false,
        sessionType: 'POMODORO',
      });
    }

    // Always sync with server
    await request(
      '/api/activity/live/start',
      auth,
      {
        sessionId: session.sessionId,
        taskId: session.taskId,
        taskTitle: session.taskTitle,
        plannedDurationMinutes: session.plannedDurationMinutes,
        deviceId: auth.deviceId,
      },
      'POST',
    );
  },

  update: async (session, auth) => {
    const elapsedSeconds = session.remainingSeconds ?? 0;

    updateNativeUI({
      elapsedSeconds,
      isPaused: false,
    });

    await request('/api/activity/live/heartbeat', auth, {
      sessionId: session.sessionId,
      remainingSeconds: session.remainingSeconds,
      deviceId: auth.deviceId,
    });
  },

  pause: async (sessionId, auth) => {
    updateNativeUI({ elapsedSeconds: 0, isPaused: true });

    await request('/api/activity/live/pause', auth, { sessionId, deviceId: auth.deviceId });
  },

  resume: async (sessionId, auth) => {
    updateNativeUI({ elapsedSeconds: 0, isPaused: false });

    await request('/api/activity/live/resume', auth, { sessionId, deviceId: auth.deviceId });
  },

  stop: async (sessionId, auth, outcome = 'COMPLETED') => {
    clearNativeUI();

    await request('/api/activity/live/stop', auth, { sessionId, deviceId: auth.deviceId, outcome });
  },
};
 