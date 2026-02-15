import type { Response } from "express";
import { prisma } from "@repo/db";
import {
  composeNotificationSchema,
  geofencePingSchema,
  notificationDirectReplySchema,
  revisionDripCampaignSchema,
} from "@repo/schemas/notification";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

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

export const composeNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    const parsed = composeNotificationSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid notification payload", errors: parsed.error.flatten() });
      return;
    }

    const payload = parsed.data;
    const created = await prisma.nudge.create({
      data: {
        userId,
        type: payload.category,
        title: payload.title,
        message: payload.body,
        priority: payload.priority,
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

    res.status(201).json({
      message: "Rich notification composed",
      notification: {
        ...created,
        metadata: parseMetadata(created.metadata),
      },
    });
  } catch (error) {
    console.error("Error composing notification:", error);
    res.status(500).json({ message: "Failed to compose notification" });
  }
};

export const postDirectReply = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    const parsed = notificationDirectReplySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid direct reply payload", errors: parsed.error.flatten() });
      return;
    }

    const { taskId, nudgeId, text } = parsed.data;

    if (taskId) {
      const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
      if (!task) { res.status(404).json({ message: "Task not found" }); return; }

      const notePrefix = "\n\n[Quick Reply Note]\n";
      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: { description: `${task.description ?? ""}${notePrefix}${text}`.trim() },
      });

      res.status(200).json({ message: "Direct reply saved to task", task: updatedTask });
      return;
    }

    if (nudgeId) {
      const nudge = await prisma.nudge.findFirst({ where: { id: nudgeId, userId } });
      if (!nudge) { res.status(404).json({ message: "Notification not found" }); return; }

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

      res.status(200).json({
        message: "Direct reply recorded",
        nudge: { ...updated, metadata: parseMetadata(updated.metadata) },
      });
      return;
    }

    res.status(400).json({ message: "Either taskId or nudgeId is required" });
  } catch (error) {
    console.error("Error handling direct reply:", error);
    res.status(500).json({ message: "Failed to process direct reply" });
  }
};

export const createRevisionDripCampaign = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    const parsed = revisionDripCampaignSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid drip campaign payload", errors: parsed.error.flatten() });
      return;
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
            type: item.type,
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

    res.status(201).json({ message: "Revision drip campaign created", campaign: created });
  } catch (error) {
    console.error("Error creating revision drip campaign:", error);
    res.status(500).json({ message: "Failed to create revision drip campaign" });
  }
};

export const triggerGeofencePing = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    const parsed = geofencePingSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid geofence payload", errors: parsed.error.flatten() });
      return;
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
        type: "URGENCY_DRIVEN",
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

    res.status(201).json({ message: "Geofence reminder queued", nudge: created });
  } catch (error) {
    console.error("Error triggering geofence ping:", error);
    res.status(500).json({ message: "Failed to trigger geofence ping" });
  }
};

export const getNotificationDeepLink = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

  const { entityType, entityId } = req.params;
  const normalizedEntityType = Array.isArray(entityType) ? entityType[0] : entityType;
  const normalizedEntityId = Array.isArray(entityId) ? entityId[0] : entityId;
  if (!normalizedEntityType || !normalizedEntityId) { res.status(400).json({ message: "entityType and entityId are required" }); return; }

  const routes: Record<string, string> = {
    task: `/tasks/${normalizedEntityId}`,
    exam: `/exam-warroom?examId=${normalizedEntityId}`,
    habit: `/habits?habitId=${normalizedEntityId}`,
    briefing: `/dashboard`,
  };

  const deepLink = routes[normalizedEntityType.toLowerCase()] || "/dashboard";
  res.status(200).json({ message: "Deep link resolved", deepLink });
};
