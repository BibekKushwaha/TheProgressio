'use client';

import { useEffect, useState } from 'react';
import {
    useGetProfileQuery,
    useGetPushStatusQuery,
    useSendPushTestMutation,
    useSubscribeToPushMutation,
    useUnsubscribeFromPushMutation,
} from '@repo/store';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

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

export function PushNotificationManager() {
    const { data: profileData } = useGetProfileQuery();
    const user = profileData?.user;
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

    useEffect(() => {
        if (!isSupported || !user) return;
        void bootstrapSubscription();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSupported, user?.id]);

    const ensureRegistration = async (): Promise<ServiceWorkerRegistration> => {
        await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none',
        });
        return navigator.serviceWorker.ready;
    };

    const syncSubscriptionToBackend = async (sub: PushSubscription): Promise<boolean> => {
        const subJson = sub.toJSON();
        if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
            toast.error('Push subscription is invalid. Please re-enable notifications.');
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
            return true;
        } catch (err) {
            console.error('Failed to register subscription with backend:', err);
            setBackendStatus('failed');
            return false;
        }
    };

    const bootstrapSubscription = async () => {
        try {
            const registration = await ensureRegistration();
            const existing = await registration.pushManager.getSubscription();
            setBrowserSubscription(existing);

            if (existing) {
                const ok = await syncSubscriptionToBackend(existing);
                if (ok) return;
            }
        } catch (err) {
            console.error('Push bootstrap failed:', err);
        }
    };

    async function subscribe() {
        try {
            const permission = await Notification.requestPermission();
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

            if (!VAPID_PUBLIC_KEY) {
                console.error('Push notifications are unavailable: NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured.');
                toast.error('Push notifications are not configured.');
                return;
            }

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            setBrowserSubscription(sub);
            const ok = await syncSubscriptionToBackend(sub);
            if (ok) toast.success('Notifications enabled!');
            else toast.error('Subscribed in browser, but backend registration failed. Tap retry.');
        } catch (err) {
            console.error('Failed to subscribe to push:', err);
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
        try {
            if (subJson.endpoint) {
                await unsubscribeFromPush({ endpoint: subJson.endpoint }).unwrap();
            }
        } catch (err) {
            console.warn('Backend unsubscribe failed (continuing):', err);
        }

        try {
            await browserSubscription.unsubscribe();
        } catch (err) {
            console.warn('Browser unsubscribe failed:', err);
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
            console.error('Failed to send test push:', err);
            toast.error('Failed to send test notification');
        }
    }

    if (!isSupported || !user) {
        return null;
    }

    const vapidConfigured = pushStatus?.vapidConfigured;

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {!browserSubscription ? (
                <button
                    onClick={subscribe}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full shadow-lg transition-all active:scale-95 flex items-center gap-2 text-sm font-medium"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    Enable Push Notifications
                </button>
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
                        disabled={isSendingTest || vapidConfigured === false}
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
