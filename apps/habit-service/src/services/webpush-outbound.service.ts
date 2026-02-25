import webpush from "web-push";
import { prisma } from "@repo/db";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

const vapidConfigured = Boolean(vapidPublicKey && vapidPrivateKey);

if (vapidConfigured) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} else {
    console.warn("⚠️  Web Push VAPID keys missing. Web push dispatch disabled.");
}

type WebPushDispatchStatus = "sent" | "skipped" | "failed";

export interface WebPushDispatchResult {
    status: WebPushDispatchStatus;
    reason?: string;
    sentCount?: number;
    removedCount?: number;
    error?: string;
}

export const dispatchWebPushNudge = async (
    nudge: { id: string; userId: string; title: string; message: string; priority: string },
    deepLink: string,
): Promise<WebPushDispatchResult> => {
    if (!vapidConfigured) {
        return { status: "skipped", reason: "vapid_not_configured", sentCount: 0, removedCount: 0 };
    }

    const subscriptions = await prisma.webPushSubscription.findMany({
        where: { userId: nudge.userId },
    });

    if (subscriptions.length === 0) {
        return { status: "skipped", reason: "no_subscription", sentCount: 0, removedCount: 0 };
    }

    const title = (nudge.title || "Student Activity Tracker").slice(0, 50);
    const body = (nudge.message || "").slice(0, 150);
    const url = deepLink || "/dashboard";

    const payload = JSON.stringify({
        notification: {
            title,
            body,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: `nudge-${nudge.id}`,
            requireInteraction: nudge.priority === "HIGH",
            data: {
                url,
                nudgeId: nudge.id,
                priority: nudge.priority,
            },
        },
    });

    let sentCount = 0;
    let removedCount = 0;
    let failureCount = 0;
    let lastError: string | undefined;

    for (const sub of subscriptions) {
        try {
            await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth,
                    },
                },
                payload,
            );
            sentCount += 1;
        } catch (error: any) {
            const statusCode = error?.statusCode;
            if (statusCode === 410 || statusCode === 404) {
                try {
                    await prisma.webPushSubscription.delete({ where: { id: sub.id } });
                    removedCount += 1;
                } catch (deleteError) {
                    console.warn("Failed to remove invalid push subscription:", deleteError);
                }
                continue;
            }
            failureCount += 1;
            lastError = error instanceof Error ? error.message : "Unknown web push error";
        }
    }

    if (sentCount > 0) {
        return { status: "sent", sentCount, removedCount };
    }

    if (failureCount > 0) {
        return { status: "failed", sentCount, removedCount, error: lastError ?? "Web push dispatch failed" };
    }

    return { status: "skipped", reason: "no_subscription", sentCount, removedCount };
};
