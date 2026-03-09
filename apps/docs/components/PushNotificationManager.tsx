'use client';

import { useEffect, useState } from 'react';
import {
    selectCurrentUser,
    useGetPushStatusQuery,
    useSendPushTestMutation,
    useSubscribeToPushMutation,
    useUnsubscribeFromPushMutation,
    useAppSelector,
} from '@repo/store';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// Debug logging is stripped in production builds.
const isDev = process.env.NODE_ENV !== 'production';
const debugLog = isDev
    ? (msg: string, data?: Record<string, unknown>) =>
        console.info(`[PushDebug][Client] ${msg}`, data ?? '')
    : () => { };

type BackendStatus = 'idle' | 'registering' | 'registered' | 'failed';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function maskEndpoint(endpoint?: string): string {
    if (!endpoint) return 'none';
    return `${endpoint.slice(0, 40)}...${endpoint.slice(-12)}`;
}

export function PushNotificationManager() {
    const user = useAppSelector(selectCurrentUser);
    const [isSupported, setIsSupported] = useState(false);
    const [browserSubscription, setBrowserSubscription] = useState<PushSubscription | null>(null);
    const [backendStatus, setBackendStatus] = useState<BackendStatus>('idle');
    const [subscribeToPush] = useSubscribeToPushMutation();
    const [unsubscribeFromPush] = useUnsubscribeFromPushMutation();
    const [sendPushTest, { isLoading: isSendingTest }] = useSendPushTestMutation();
    const { data: pushStatus, refetch: refetchPushStatus } = useGetPushStatusQuery(undefined, { skip: !user });

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
        }
    }, []);

    // Seed backendStatus from server-side subscription count so the UI
    // doesn't flash "Retry" on every page load while the RTK query loads.
    // We use a functional updater (prev => ...) to avoid closing over
    // `backendStatus` — this makes the dep-array omission genuinely safe:
    // the effect only fires when the subscription count changes, and the
    // updater reads the latest prev value atomically from React's state queue.
    useEffect(() => {
        if (!pushStatus?.subscriptionCount || pushStatus.subscriptionCount <= 0) return;
        setBackendStatus((prev) => (prev === 'idle' ? 'registered' : prev));
        // pushStatus.subscriptionCount is the specific dep; omitting the parent object
        // avoids extra renders when unrelated pushStatus fields (e.g. vapidConfigured) change.
    }, [pushStatus?.subscriptionCount]);

    useEffect(() => {
        if (!isSupported || !user) return;
        void bootstrapSubscription();
        // bootstrapSubscription is an async function defined inside the component.
        // Including it in deps would cause re-subscription on every render because
        // it's re-created on each render. We intentionally depend only on the stable
        // identifiers that should trigger a re-bootstrap: isSupported and user.id.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSupported, user?.id]);

    // Listen for the user revoking notification permission after subscription.
    useEffect(() => {
        if (!isSupported) return;
        if (typeof Notification === 'undefined' || !('permissions' in navigator)) return;

        let permStatus: PermissionStatus | null = null;

        const handlePermissionChange = () => {
            if (permStatus?.state === 'denied' || Notification.permission === 'denied') {
                debugLog('notification permission revoked — clearing backendStatus');
                setBrowserSubscription(null);
                setBackendStatus('idle');
                refetchPushStatus();
            }
        };

        navigator.permissions.query({ name: 'notifications' as PermissionName }).then((ps) => {
            permStatus = ps;
            ps.addEventListener('change', handlePermissionChange);
        }).catch(() => { /* some browsers block this query */ });

        return () => {
            permStatus?.removeEventListener('change', handlePermissionChange);
        };
        // refetchPushStatus is a stable RTK Query function reference — it does not
        // change between renders, so omitting it from deps is safe. The effect only
        // needs to re-run when isSupported changes (i.e. once, after mount).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSupported]);

    // Handle messages posted by the service worker (e.g. permission revoked mid-session).
    useEffect(() => {
        if (!isSupported) return;

        const handleSwMessage = (event: MessageEvent) => {
            if (event.data?.type === 'PUSH_PERMISSION_REVOKED') {
                debugLog('SW reported PUSH_PERMISSION_REVOKED — resetting UI');
                setBrowserSubscription(null);
                setBackendStatus('idle');
                refetchPushStatus();
                toast.error('Notification permission was revoked. Re-enable to receive push alerts.');
            }
        };

        navigator.serviceWorker.addEventListener('message', handleSwMessage);
        return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSupported]);

    const ensureRegistration = async (): Promise<ServiceWorkerRegistration> => {
        debugLog('registering service worker /sw.js');
        await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none',
        });
        const ready = await navigator.serviceWorker.ready;
        debugLog('service worker ready', {
            scope: ready.scope,
            activeState: ready.active?.state as string | undefined,
        });
        return ready;
    };

    const syncSubscriptionToBackend = async (sub: PushSubscription): Promise<boolean> => {
        const subJson = sub.toJSON();
        debugLog('syncSubscriptionToBackend start', {
            endpoint: maskEndpoint(subJson.endpoint),
            hasP256dh: String(Boolean(subJson.keys?.p256dh)),
            hasAuth: String(Boolean(subJson.keys?.auth)),
        });
        if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
            toast.error('Push subscription is invalid. Please re-enable notifications.');
            debugLog('invalid subscription payload before backend sync');
            return false;
        }

        setBackendStatus('registering');
        try {
            await subscribeToPush({
                endpoint: subJson.endpoint,
                keys: subJson.keys,
                userAgent: navigator.userAgent,
            }).unwrap();
            setBackendStatus('registered');
            refetchPushStatus();
            debugLog('backend subscription saved', {
                endpoint: maskEndpoint(subJson.endpoint),
            });
            return true;
        } catch (err) {
            if (isDev) console.error('Failed to register subscription with backend:', err);
            setBackendStatus('failed');
            return false;
        }
    };

    const bootstrapSubscription = async () => {
        try {
            const registration = await ensureRegistration();
            const existing = await registration.pushManager.getSubscription();
            debugLog('bootstrap existing subscription', {
                exists: String(Boolean(existing)),
                endpoint: maskEndpoint(existing?.endpoint),
                permission: Notification.permission,
            });
            setBrowserSubscription(existing);

            if (existing) {
                const ok = await syncSubscriptionToBackend(existing);
                if (ok) return;
            }
        } catch (err) {
            if (isDev) console.error('Push bootstrap failed:', err);
        }
    };

    async function subscribe() {
        try {
            if (!VAPID_PUBLIC_KEY || !VAPID_PUBLIC_KEY.trim()) {
                toast.error('Push notifications are not configured.');
                return;
            }

            const initialPermission = Notification.permission;
            debugLog('subscribe clicked', { initialPermission });

            if (initialPermission === 'denied') {
                toast.error('Notifications blocked — enable in browser settings.');
                debugLog('permission denied before request');
                return;
            }

            const permission = initialPermission === 'granted'
                ? 'granted'
                : await Notification.requestPermission();

            debugLog('permission result', { permission });
            if (permission !== 'granted') {
                toast.error('Notifications blocked — enable in browser settings.');
                return;
            }

            const registration = await ensureRegistration();
            const existing = await registration.pushManager.getSubscription();
            if (existing) {
                setBrowserSubscription(existing);
                const ok = await syncSubscriptionToBackend(existing);
                if (ok) toast.success('Notifications enabled!');
                else toast.error('Subscribed in browser, but backend registration failed. Tap retry.');
                return;
            }

            const trimmedVapidKey = VAPID_PUBLIC_KEY.trim();
            const isLikelyBase64Url = /^[A-Za-z0-9_-]+$/.test(trimmedVapidKey);
            if (!isLikelyBase64Url || trimmedVapidKey.length < 80) {
                debugLog('invalid NEXT_PUBLIC_VAPID_PUBLIC_KEY format', {
                    length: String(trimmedVapidKey.length),
                    base64UrlLike: String(isLikelyBase64Url),
                });
                toast.error('Push key is invalid. Contact support.');
                return;
            }

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(trimmedVapidKey),
            });

            debugLog('browser subscription created', {
                endpoint: maskEndpoint(sub.endpoint),
                expirationTime: String(sub.expirationTime),
            });

            setBrowserSubscription(sub);
            const ok = await syncSubscriptionToBackend(sub);
            if (ok) toast.success('Notifications enabled!');
            else toast.error('Subscribed in browser, but backend registration failed. Tap retry.');
        } catch (err) {
            if (isDev) console.error('Failed to subscribe to push:', err);
            toast.error('Failed to enable notifications');
        }
    }

    async function retryBackendRegistration() {
        if (!browserSubscription) return;
        const ok = await syncSubscriptionToBackend(browserSubscription);
        if (ok) toast.success('Notifications enabled!');
        else toast.error('Backend registration failed. Try again.');
    }

    async function disableNotifications() {
        if (!browserSubscription) return;
        const subJson = browserSubscription.toJSON();
        debugLog('disable notifications', {
            endpoint: maskEndpoint(subJson.endpoint),
        });
        try {
            if (subJson.endpoint) {
                await unsubscribeFromPush({ endpoint: subJson.endpoint }).unwrap();
            }
        } catch (err) {
            if (isDev) console.warn('Backend unsubscribe failed (continuing):', err);
        }

        try {
            await browserSubscription.unsubscribe();
        } catch (err) {
            if (isDev) console.warn('Browser unsubscribe failed:', err);
        }

        setBrowserSubscription(null);
        setBackendStatus('idle');
        refetchPushStatus();
        toast.success('Notifications disabled');
    }

    async function sendTestNotification() {
        try {
            const res = await sendPushTest().unwrap();
            toast.success(res.message);
        } catch (err) {
            if (isDev) console.error('Failed to send test push:', err);
            toast.error('Failed to send test notification');
        }
    }

    if (!isSupported || !user) {
        return null;
    }

    const clientVapidConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PUBLIC_KEY.trim().length > 0);
    const vapidConfigured = pushStatus?.vapidConfigured;

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {!browserSubscription ? (
                <div className="flex flex-col gap-2 items-end">
                    <button
                        onClick={subscribe}
                        disabled={!clientVapidConfigured}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded-full shadow-lg transition-all active:scale-95 flex items-center gap-2 text-sm font-medium"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        Enable Push Notifications
                    </button>
                    {!clientVapidConfigured ? (
                        <div className="text-xs text-amber-300/90 bg-black/30 px-3 py-1 rounded-full border border-amber-300/20">
                            Client push not configured (missing public VAPID key)
                        </div>
                    ) : null}
                </div>
            ) : backendStatus !== 'registered' ? (
                <div className="flex flex-col gap-2 items-end">
                    <button
                        onClick={retryBackendRegistration}
                        disabled={backendStatus === 'registering'}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded-full shadow-lg transition-all active:scale-95 flex items-center gap-2 text-sm font-medium"
                    >
                        {backendStatus === 'registering' ? 'Enabling…' : 'Retry Enable Notifications'}
                    </button>
                    <button
                        onClick={disableNotifications}
                        className="bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-full border border-white/20 shadow-lg transition-all active:scale-95 text-sm font-medium"
                    >
                        Disable
                    </button>
                    {vapidConfigured === false ? (
                        <div className="text-xs text-amber-300/90 bg-black/30 px-3 py-1 rounded-full border border-amber-300/20">
                            Server push not configured (VAPID keys missing)
                        </div>
                    ) : null}
                </div>
            ) : (
                <div className="flex flex-col gap-2 items-end">
                    <button
                        onClick={sendTestNotification}
                        disabled={isSendingTest || vapidConfigured === false || (pushStatus?.subscriptionCount ?? 0) === 0}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded-full shadow-lg transition-all active:scale-95 flex items-center gap-2 text-sm font-medium"
                    >
                        {isSendingTest ? 'Sending…' : 'Send Test Notification'}
                    </button>
                    <button
                        onClick={disableNotifications}
                        className="bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-full border border-white/20 shadow-lg transition-all active:scale-95 text-sm font-medium"
                    >
                        Disable Notifications
                    </button>
                </div>
            )}
        </div>
    );
}
