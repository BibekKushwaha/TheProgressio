import type { Response } from "express";
import { prisma } from "@repo/db";
import ErrorHandler from "../utils/errorHandler.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readInt = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
};

const requireUserMode = (req: AuthenticatedRequest): void => {
  if (req.authContext?.mode === "share") {
    throw new ErrorHandler(403, "Share links cannot manage mentorship settings");
  }
};

export const listMentorAlertSubscriptions = async (req: AuthenticatedRequest, res: Response) => {
  requireUserMode(req);
  const userId = req.user?.id;
  if (!userId) throw new ErrorHandler(401, "Not authenticated");

  const subscriptions = await prisma.mentorAlertSubscription.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({ message: "Mentor alert subscriptions fetched", subscriptions });
};

export const createMentorAlertSubscription = async (req: AuthenticatedRequest, res: Response) => {
  requireUserMode(req);
  const userId = req.user?.id;
  if (!userId) throw new ErrorHandler(401, "Not authenticated");

  const recipientPhone = readString((req.body ?? {}).recipientPhone);
  if (!recipientPhone) throw new ErrorHandler(400, "recipientPhone is required");

  const label = readString((req.body ?? {}).label);
  const cadence = (readString((req.body ?? {}).cadence) ?? "IMMEDIATE").toUpperCase();
  const enabled = (req.body ?? {}).enabled === undefined ? true : Boolean((req.body ?? {}).enabled);

  const overdueThreshold = readInt((req.body ?? {}).overdueThreshold);
  const consistencyThreshold = readInt((req.body ?? {}).consistencyThreshold);
  const cooldownMinutes = readInt((req.body ?? {}).cooldownMinutes);

  const createData: any = {
    userId,
    label,
    recipientPhone,
    cadence,
    enabled,
  };

  if (overdueThreshold !== null) createData.overdueThreshold = Math.max(0, overdueThreshold);
  if (consistencyThreshold !== null) createData.consistencyThreshold = Math.max(0, consistencyThreshold);
  if (cooldownMinutes !== null) createData.cooldownMinutes = Math.max(0, cooldownMinutes);

  const subscription = await prisma.mentorAlertSubscription.create({
    data: createData,
  });

  res.status(201).json({ message: "Mentor alert subscription created", subscription });
};

export const updateMentorAlertSubscription = async (req: AuthenticatedRequest, res: Response) => {
  requireUserMode(req);
  const userId = req.user?.id;
  if (!userId) throw new ErrorHandler(401, "Not authenticated");

  const id = readString(req.params?.id);
  if (!id) throw new ErrorHandler(400, "Invalid subscription id");

  const data: Record<string, unknown> = {};
  const label = readString((req.body ?? {}).label);
  const recipientPhone = readString((req.body ?? {}).recipientPhone);
  const cadence = readString((req.body ?? {}).cadence);

  if ((req.body ?? {}).enabled !== undefined) data.enabled = Boolean((req.body ?? {}).enabled);
  if (label !== null) data.label = label;
  if (recipientPhone !== null) data.recipientPhone = recipientPhone;
  if (cadence !== null) data.cadence = cadence.toUpperCase();

  const overdueThreshold = readInt((req.body ?? {}).overdueThreshold);
  const consistencyThreshold = readInt((req.body ?? {}).consistencyThreshold);
  const cooldownMinutes = readInt((req.body ?? {}).cooldownMinutes);
  if (overdueThreshold !== null) data.overdueThreshold = Math.max(0, overdueThreshold);
  if (consistencyThreshold !== null) data.consistencyThreshold = Math.max(0, consistencyThreshold);
  if (cooldownMinutes !== null) data.cooldownMinutes = Math.max(0, cooldownMinutes);

  const updated = await prisma.mentorAlertSubscription.updateMany({
    where: { id, userId, revokedAt: null },
    data,
  });

  if (updated.count === 0) throw new ErrorHandler(404, "Subscription not found");

  const subscription = await prisma.mentorAlertSubscription.findUnique({ where: { id } });
  res.status(200).json({ message: "Mentor alert subscription updated", subscription });
};

export const revokeMentorAlertSubscription = async (req: AuthenticatedRequest, res: Response) => {
  requireUserMode(req);
  const userId = req.user?.id;
  if (!userId) throw new ErrorHandler(401, "Not authenticated");

  const id = readString(req.params?.id);
  if (!id) throw new ErrorHandler(400, "Invalid subscription id");

  const updated = await prisma.mentorAlertSubscription.updateMany({
    where: { id, userId, revokedAt: null },
    data: { revokedAt: new Date(), enabled: false },
  });

  if (updated.count === 0) throw new ErrorHandler(404, "Subscription not found");
  res.status(200).json({ message: "Mentor alert subscription revoked" });
};

export const listMentorFeedback = async (req: AuthenticatedRequest, res: Response) => {
  requireUserMode(req);
  const userId = req.user?.id;
  if (!userId) throw new ErrorHandler(401, "Not authenticated");

  const feedback = await prisma.mentorFeedback.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  res.status(200).json({ message: "Mentor feedback fetched", feedback });
};

export const createMentorFeedback = async (req: AuthenticatedRequest, res: Response) => {
  if (req.authContext?.mode !== "share") {
    throw new ErrorHandler(403, "Mentor feedback requires a share-link session");
  }

  const userId = req.user?.id;
  if (!userId) throw new ErrorHandler(401, "Not authenticated");

  const message = readString((req.body ?? {}).message);
  if (!message) throw new ErrorHandler(400, "message is required");
  if (message.length > 2000) throw new ErrorHandler(400, "message is too long");

  const fromLabel = readString((req.body ?? {}).fromLabel);

  const feedback = await prisma.mentorFeedback.create({
    data: {
      userId,
      shareLinkId: req.authContext?.shareLinkId ?? null,
      fromLabel,
      message,
    },
  });

  res.status(201).json({ message: "Feedback sent", feedback });
};
