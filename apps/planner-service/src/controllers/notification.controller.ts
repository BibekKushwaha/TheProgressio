import type { Response } from "express";
import { prisma } from "@repo/db";
import {
  composeNotificationSchema,
  geofencePingSchema,
  notificationDirectReplySchema,
  revisionDripCampaignSchema,
} from "@repo/schemas/notification";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { TryCatch } from "../utils/tryCatch.js";
import ErrorHandler from "../utils/errorHandler.js";
import { sendPushNotification } from "../services/push.service.js";
import { emitPushEvent } from "../services/queue.service.js";

const parseMetadata = (raw: string | null | undefined): Record<string, unknown> => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
};

export const composeNotification = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const parsed = composeNotificationSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw new ErrorHandler(400, "Invalid notification payload");
  }

  const payload = parsed.data;
  const created = await prisma.nudge.create({
    data: {
      userId,
      type: payload.category as any,
      title: payload.title,
      message: payload.body,
      priority: payload.priority as any,
      metadata: JSON.stringify({
        anatomy: {
          emoji: payload.emoji,
          imageUrl: payload.imageUrl,
          richMedia: payload.richMedia ?? null,
          progress: payload.progress ?? null,
        },
        actions: payload.actions ?? [],
        deepLink: payload.deepLink,
        directReplyEnabled: payload.directReplyEnabled,
        whatsappFallback: payload.whatsappFallback,
        ...(payload.taskId ? { taskId: payload.taskId } : {}),
        ...(payload.examId ? { examId: payload.examId } : {}),
        ...(payload.metadata ?? {}),
      }),
    },
  });

  // Ensure stored metadata includes canonical nudgeId for client-side actions
  let record = created;
  let recordMetadata = parseMetadata(record.metadata);
  try {
    const parsedMeta = parseMetadata(created.metadata);
    if (!parsedMeta.nudgeId) parsedMeta.nudgeId = created.id;
    record = await prisma.nudge.update({
      where: { id: created.id },
      data: { metadata: JSON.stringify(parsedMeta) },
    });
    recordMetadata = parseMetadata(record.metadata);
  } catch (e) {
    // If update fails for any reason, fall back to returning created record with injected metadata
    console.warn('Failed to persist nudgeId into metadata, returning injected value', e);
    recordMetadata = { ...recordMetadata, nudgeId: created.id };
  }

  // Enqueue or send Web Push Notification
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const pushPayload: any = {
      userId,
      title: payload.title,
      body: payload.body,
      deepLink: payload.deepLink,
      dedupeKey: `push-compose-${userId}-${todayStr}-${Date.now()}`, // simple dedupe for explicit composes
    };
    if (!payload.emoji && payload.imageUrl) {
      pushPayload.icon = payload.imageUrl;
    }

    if (process.env.QUEUE_ENABLED === "true") {
      await emitPushEvent(pushPayload);
    } else {
      await sendPushNotification(userId, {
        title: pushPayload.title,
        body: pushPayload.body,
        ...(pushPayload.icon ? { icon: pushPayload.icon } : {}),
        deepLink: pushPayload.deepLink,
      });
    }
  } catch (pushErr) {
    console.error("Critical: Failed to enqueue web push:", pushErr);
  }

  return res.status(201).json({
    message: "Rich notification composed",
    notification: {
      ...record,
      metadata: recordMetadata,
    },
  });
});

export const sendPushTest = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const queueEnabled = process.env.QUEUE_ENABLED === "true";
  const subscriptionCount = await prisma.webPushSubscription.count({ where: { userId } });
  const nowIso = new Date().toISOString();

  if (subscriptionCount === 0) {
    return res.status(200).json({
      mode: queueEnabled ? "queued" : "direct",
      subscriptionCount,
      message: "No push subscriptions found. Enable push notifications first.",
    });
  }

  const title = "Test Notification";
  const body = `Push test at ${nowIso}`;
  const deepLink = "/dashboard";

  try {
    if (queueEnabled) {
      await emitPushEvent({
        userId,
        title,
        body,
        deepLink,
        dedupeKey: `push-test-${userId}-${Date.now()}`,
      });
      return res.status(200).json({
        mode: "queued",
        subscriptionCount,
        message: `Test push queued (${nowIso})`,
      });
    }

    await sendPushNotification(userId, { title, body, deepLink });
    return res.status(200).json({
      mode: "direct",
      subscriptionCount,
      message: `Test push sent (${nowIso})`,
    });
  } catch (error) {
    console.error("Failed to send test push:", error);
    const vapidConfigured = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
    return res.status(500).json({
      mode: queueEnabled ? "queued" : "direct",
      subscriptionCount,
      message: vapidConfigured ? "Failed to send push notification" : "VAPID keys are not configured on server",
    });
  }
});

export const getPushStatus = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const subscriptionCount = await prisma.webPushSubscription.count({ where: { userId } });
  const queueEnabled = process.env.QUEUE_ENABLED === "true";
  const vapidConfigured = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

  return res.status(200).json({
    queueEnabled,
    vapidConfigured,
    subscriptionCount,
  });
});

export const subscribeToPush = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { endpoint, keys, userAgent } = req.body;

  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    throw new ErrorHandler(400, "Invalid subscription payload");
  }

  await prisma.webPushSubscription.upsert({
    where: { endpoint },
    update: {
      userId,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    },
    create: {
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    },
  });

  return res.status(201).json({ message: "Subscribed to web push notifications" });
});

export const unsubscribeFromPush = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const { endpoint } = req.body;

  if (!endpoint) {
    throw new ErrorHandler(400, "Endpoint is required");
  }

  await prisma.webPushSubscription.deleteMany({
    where: { endpoint },
  });

  return res.status(200).json({ message: "Unsubscribed from web push notifications" });
});

export const postDirectReply = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const parsed = notificationDirectReplySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw new ErrorHandler(400, "Invalid direct reply payload");
  }

  const { taskId, nudgeId, text } = parsed.data;

  if (taskId) {
    const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
    if (!task) throw new ErrorHandler(404, "Task not found");

    const notePrefix = "\n\n[Quick Reply Note]\n";
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { description: `${task.description ?? ""}${notePrefix}${text}`.trim() },
    });

    return res.status(200).json({ message: "Direct reply saved to task", task: updatedTask });
  }

  if (nudgeId) {
    const nudge = await prisma.nudge.findFirst({ where: { id: nudgeId, userId } });
    if (!nudge) throw new ErrorHandler(404, "Notification not found");

    const metadata = parseMetadata(nudge.metadata);
    const replyTrail = Array.isArray(metadata.directReplies) ? metadata.directReplies : [];
    const updated = await prisma.nudge.update({
      where: { id: nudgeId },
      data: {
        metadata: JSON.stringify({
          ...metadata,
          directReplies: [...replyTrail, { text, at: new Date().toISOString() }],
        }),
      },
    });

    return res.status(200).json({
      message: "Direct reply recorded",
      nudge: { ...updated, metadata: parseMetadata(updated.metadata) },
    });
  }

  throw new ErrorHandler(400, "Either taskId or nudgeId is required");
});

export const createRevisionDripCampaign = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const parsed = revisionDripCampaignSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw new ErrorHandler(400, "Invalid drip campaign payload");
  }

  const { examTitle, examDate, chapter, deepLinkBase } = parsed.data;
  const now = new Date();
  const nextMonday = new Date(now);
  const day = nextMonday.getDay();
  const shift = (8 - day) % 7;
  nextMonday.setDate(nextMonday.getDate() + (shift === 0 ? 7 : shift));

  const wednesday = new Date(nextMonday);
  wednesday.setDate(nextMonday.getDate() + 2);
  const friday = new Date(nextMonday);
  friday.setDate(nextMonday.getDate() + 4);

  const chapterText = chapter?.trim() ? ` for ${chapter.trim()}` : "";

  const campaign = [
    {
      type: "ADVANCE_ALERT_3WEEK",
      title: `A nudge to review feedback${chapterText}`.slice(0, 50),
      message: `Monday check-in: use feedback notes to sharpen your revision before ${examTitle}.`,
      scheduledAt: nextMonday,
    },
    {
      type: "ADVANCE_ALERT_3WEEK",
      title: `A check-in for midweek study guide`.slice(0, 50),
      message: `Wednesday pulse: complete one focused guide session${chapterText}.`,
      scheduledAt: wednesday,
    },
    {
      type: "ADVANCE_ALERT_3WEEK",
      title: `A nudge for final Q&A sprint`.slice(0, 50),
      message: `Friday final prep: attempt a quick Q&A round before ${examDate.toLocaleDateString()}.`,
      scheduledAt: friday,
    },
  ];

  const created = await Promise.all(
    campaign.map((item) =>
      prisma.nudge.create({
        data: {
          userId,
          type: item.type as any,
          title: item.title,
          message: item.message,
          priority: "MEDIUM",
          scheduledAt: item.scheduledAt,
          metadata: JSON.stringify({
            deepLink: `${deepLinkBase}?exam=${encodeURIComponent(examTitle)}`,
            dripCampaign: true,
          }),
        },
      }),
    ),
  );

  return res.status(201).json({ message: "Revision drip campaign created", campaign: created });
});

export const triggerGeofencePing = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const parsed = geofencePingSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw new ErrorHandler(400, "Invalid geofence payload");
  }

  const { placeType, plannedTaskId, brightness, motionState } = parsed.data;
  const task = plannedTaskId ? await prisma.task.findFirst({ where: { id: plannedTaskId, userId } }) : null;

  const title = `A nudge to start your ${placeType.toLowerCase()} block`.slice(0, 50);
  const message = task
    ? `You reached ${placeType.toLowerCase()}. Start “${task.title}” now while context is fresh.`
    : `You reached ${placeType.toLowerCase()}. This is a good moment for your planned study block.`;

  const created = await prisma.nudge.create({
    data: {
      userId,
      type: "URGENCY_DRIVEN" as any,
      title,
      message: message.slice(0, 150),
      priority: "HIGH",
      metadata: JSON.stringify({
        deepLink: task ? `/tasks/${task.id}` : "/planner",
        location: placeType,
        environmental: { brightness, motionState },
      }),
    },
  });

  return res.status(201).json({ message: "Geofence reminder queued", nudge: created });
});

export const getNotificationDeepLink = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const { entityType, entityId } = req.params;
  const normalizedEntityType = Array.isArray(entityType) ? entityType[0] : entityType;
  const normalizedEntityId = Array.isArray(entityId) ? entityId[0] : entityId;

  if (!normalizedEntityType || !normalizedEntityId) {
    throw new ErrorHandler(400, "entityType and entityId are required");
  }

  const routes: Record<string, string> = {
    task: `/tasks/${normalizedEntityId}`,
    exam: `/exam-warroom?examId=${normalizedEntityId}`,
    habit: `/habits?habitId=${normalizedEntityId}`,
    briefing: `/dashboard`,
  };

  const deepLink = routes[normalizedEntityType.toLowerCase()] || "/dashboard";
  return res.status(200).json({ message: "Deep link resolved", deepLink });
});
