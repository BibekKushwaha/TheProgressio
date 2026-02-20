import webpush from "web-push";
import { prisma } from "@repo/db";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export const sendPushNotification = async (
    userId: string,
    payload: { title: string; body: string; icon?: string; deepLink?: string }
) => {
    const subscriptions = await prisma.webPushSubscription.findMany({
        where: { userId },
    });

    if (subscriptions.length === 0) {
        console.log(`No push subscriptions found for user ${userId}`);
        return;
    }

    const notificationPayload = JSON.stringify({
        notification: {
            title: payload.title,
            body: payload.body,
            icon: payload.icon || "/favicon.ico",
            data: {
                url: payload.deepLink || "/dashboard",
            },
        },
    });

    const pushPromises = subscriptions.map(async (sub) => {
        try {
            await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth,
                    },
                },
                notificationPayload
            );
        } catch (error: any) {
            if (error.statusCode === 410 || error.statusCode === 404) {
                console.log(`Push subscription expired or not found, removing: ${sub.id}`);
                await prisma.webPushSubscription.delete({ where: { id: sub.id } });
            } else {
                console.error(`Error sending push notification to ${sub.id}:`, error);
            }
        }
    });

    await Promise.all(pushPromises);
};
