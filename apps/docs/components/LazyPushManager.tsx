"use client"
import dynamic from 'next/dynamic';

export const LazyPushManager = dynamic(
    () => import('@/components/PushNotificationManager').then(mod => mod.PushNotificationManager),
    { ssr: false }
);
