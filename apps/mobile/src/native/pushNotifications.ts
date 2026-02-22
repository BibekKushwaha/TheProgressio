/**
 * Push Notifications — Expo
 *
 * Handles:
 * 1. Device permission request
 * 2. Expo push token registration with the backend
 * 3. Deep link routing from notification tap
 * 4. Foreground notification display (banner when app is open)
 *
 * Architecture:
 *   App startup → requestAndRegisterPushToken()
 *     → POST /api/notifications/token {token, platform, userId}
 *   NotificationResponse handler → navigateFromNotification()
 *     → maps notification data.screen → navigation.navigate()
 */
import { useEffect, useRef, useCallback } from 'react';
import * as ExpoNotifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import { captureError } from './sentry';

// Check if running on a real device (not simulator)
const isDevice = !__DEV__ || Platform.OS !== 'web';

// ─── Foreground notification display config ───────────────────────────────────
// Show banner + badge + sound even when app is in foreground.
ExpoNotifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// ─── Token registration ───────────────────────────────────────────────────────

const BACKEND_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export async function requestAndRegisterPushToken(userId?: string): Promise<string | null> {
    if (!isDevice) {
        if (__DEV__) console.warn('[PushNotifications] Push tokens only work on physical devices.');
        return null;
    }

    // Request permission
    const { status: existing } = await ExpoNotifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
        const { status } = await ExpoNotifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        if (__DEV__) console.warn('[PushNotifications] Permission denied.');
        return null;
    }

    // Android notification channel
    if (Platform.OS === 'android') {
        await ExpoNotifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: ExpoNotifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#6366F1',
        });

        await ExpoNotifications.setNotificationChannelAsync('focus', {
            name: 'Focus Sessions',
            importance: ExpoNotifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 100],
            lightColor: '#6366F1',
        });

        await ExpoNotifications.setNotificationChannelAsync('habits', {
            name: 'Habit Reminders',
            importance: ExpoNotifications.AndroidImportance.DEFAULT,
            lightColor: '#10B981',
        });
    }

    // Get Expo push token
    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    const tokenData = await ExpoNotifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
    );
    const token = tokenData.data;

    // Register with backend
    if (userId && token) {
        try {
            await fetch(`${BACKEND_URL}/api/notifications/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    token,
                    platform: Platform.OS,
                    userId,
                }),
            });
            console.log('[PushNotifications] Token registered:', token);
        } catch (err) {
            captureError(err, { context: 'push-token-registration', token });
        }
    }

    return token;
}

// ─── Deep link routing from notification tap ──────────────────────────────────

type NotificationData = {
    screen?: string;
    taskId?: string;
    habitId?: string;
    sessionId?: string;
    eventId?: string;
    url?: string;
};

export function navigateFromNotification(
    response: ExpoNotifications.NotificationResponse,
    navRef: NavigationContainerRef<RootStackParamList>
) {
    const data = response.notification.request.content.data as NotificationData;
    if (!data?.screen || !navRef.isReady()) return;

    try {
        switch (data.screen) {
            case 'TaskDetail':
                if (data.taskId) {
                    (navRef as any).navigate('TasksTab', {
                        screen: 'TaskDetail',
                        params: { taskId: data.taskId },
                    });
                }
                break;
            case 'HabitDetail':
                if (data.habitId) {
                    (navRef as any).navigate('InsightsTab', {
                        screen: 'HabitDetail',
                        params: { habitId: data.habitId },
                    });
                }
                break;
            case 'FocusSession':
                (navRef as any).navigate('FocusTab', { screen: 'FocusSession' });
                break;
            case 'Dashboard':
                (navRef as any).navigate('HomeTab', { screen: 'Dashboard' });
                break;
            case 'ExamWarRoom':
                (navRef as any).navigate('InsightsTab', { screen: 'ExamWarRoom' });
                break;
            default:
                console.warn('[PushNotifications] Unknown screen in notification:', data.screen);
        }
    } catch (err) {
        captureError(err, { context: 'notification-navigation', data });
    }
}

// ─── React hook — use inside the root navigator ───────────────────────────────

export function usePushNotifications(
    navRef: React.RefObject<NavigationContainerRef<RootStackParamList>>,
    userId?: string
) {
    const responseListener = useRef<ExpoNotifications.EventSubscription | null>(null);
    const receivedListener = useRef<ExpoNotifications.EventSubscription | null>(null);

    useEffect(() => {
        // Register token
        if (userId) {
            requestAndRegisterPushToken(userId).catch((err) =>
                captureError(err, { context: 'usePushNotifications' })
            );
        }

        // Foreground notification listener (optional: log breadcrumb)
        receivedListener.current = ExpoNotifications.addNotificationReceivedListener((notification) => {
            if (__DEV__) {
                console.log('[PushNotifications] Received:', notification.request.content.title);
            }
        });

        // Tap / interaction listener — navigate to the relevant screen
        responseListener.current = ExpoNotifications.addNotificationResponseReceivedListener((response) => {
            if (navRef.current) {
                navigateFromNotification(response, navRef.current);
            }
        });

        return () => {
            receivedListener.current?.remove();
            responseListener.current?.remove();
        };
    }, [userId, navRef]);
}

// ─── Utility: schedule a local notification (e.g. Pomodoro timer end) ─────────

export async function scheduleLocalNotification({
    title,
    body,
    data,
    secondsFromNow,
    channelId = 'default',
}: {
    title: string;
    body: string;
    data?: NotificationData;
    secondsFromNow: number;
    channelId?: string;
}): Promise<string> {
    const id = await ExpoNotifications.scheduleNotificationAsync({
        content: { title, body, data, sound: true },
        trigger: {
            type: ExpoNotifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: Math.max(1, secondsFromNow),
            channelId,
        },
    });
    return id;
}

export async function cancelScheduledNotification(id: string) {
    await ExpoNotifications.cancelScheduledNotificationAsync(id);
}
