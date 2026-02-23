'use client';

import { useEffect, useState } from 'react';
import { useSubscribeToPushMutation } from '@repo/store';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

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
    const [isSupported, setIsSupported] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [subscribeToPush] = useSubscribeToPushMutation();

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
            registerServiceWorker();
        }
    }, []);

    async function registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'none',
            });
            const sub = await registration.pushManager.getSubscription();
            setSubscription(sub);
        } catch (err) {
            console.error('Service worker registration failed:', err);
        }
    }

    async function subscribe() {
        if (!VAPID_PUBLIC_KEY) {
            console.error('Push notifications are unavailable: NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured.');
            toast.error('Push notifications are not configured.');
            return;
        }
        try {
            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            setSubscription(sub);

            // Send to backend
            const subJson = sub.toJSON();
            await subscribeToPush({
                endpoint: subJson.endpoint,
                keys: subJson.keys,
                userAgent: navigator.userAgent,
            }).unwrap();

            toast.success('Notifications enabled!');
        } catch (err) {
            console.error('Failed to subscribe to push:', err);
            toast.error('Failed to enable notifications');
        }
    }

    if (!isSupported) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {!subscription ? (
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
            ) : null}
        </div>
    );
}
