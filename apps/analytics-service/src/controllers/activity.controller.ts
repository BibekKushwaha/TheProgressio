import type { Response } from "express";
import { prisma, SessionType } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
	focusLiveSessionRegistry,
	FocusSessionError,
} from "../services/focus-live.service.js";
import {
	activityLogSchema,
	startFocusLiveSessionSchema,
	focusLiveSignalSchema,
	focusLiveHeartbeatSchema,
	stopFocusLiveSessionSchema
} from "@repo/schemas/activity";

const MIN_LOGGABLE_SECONDS = 30;

const normalizeSessionType = (value: unknown): SessionType => {
	if (value === SessionType.POMODORO) return SessionType.POMODORO;
	if (value === SessionType.BREAK) return SessionType.BREAK;
	return SessionType.DEEP_WORK;
};

const getUserId = (req: AuthenticatedRequest, res: Response): string | null => {
	const userId = req.user?.id;
	if (!userId) {
		res.status(401).json({ message: "Unauthorized" });
		return null;
	}
	return userId;
};

const handleFocusSessionError = (error: unknown, res: Response): void => {
	if (error instanceof FocusSessionError) {
		const status =
			error.code === "NOT_FOUND"
				? 404
				: error.code === "CONFLICT"
					? 409
					: 400;
		res.status(status).json({ message: error.message, code: error.code });
		return;
	}

	console.error("Focus session controller error:", error);
	res.status(500).json({
		message: "Failed to process focus live session request",
		error: error instanceof Error ? error.message : "Unknown error",
	});
};

// Log Session - POST /activity/log
export const logSession = async (
	req: AuthenticatedRequest,
	res: Response
): Promise<void> => {
	try {
		const userId = getUserId(req, res);
		if (!userId) return;

		const { startTime, endTime, durationMinutes } = req.body ?? {};

		// Validate using shared schema
		const validation = activityLogSchema.safeParse({
			...req.body,
			sessionType: req.body.sessionType || "DEEP_WORK",
			startTime: startTime || new Date().toISOString(),
			endTime: endTime || new Date().toISOString(),
			durationMinutes: durationMinutes || 1, // Fallback for validation if not provided
		});

		if (!validation.success) {
			res.status(400).json({
				message: "Invalid session data",
				errors: validation.error.flatten(),
			});
			return;
		}

		const data = validation.data;

		const task = await prisma.task.findFirst({
			where: { id: data.taskId, userId },
		});

		if (!task) {
			res.status(404).json({ message: "Task not found" });
			return;
		}

		// Calculate duration if not explicitly provided
		const computedDuration = typeof req.body.durationMinutes === "number"
			? data.durationMinutes
			: Math.max(1, Math.round((data.endTime.getTime() - data.startTime.getTime()) / 60000));

		const log = await prisma.activityLog.create({
			data: {
				taskId: data.taskId,
				startTime: data.startTime,
				endTime: data.endTime,
				durationMinutes: computedDuration,
				sessionType: data.sessionType as SessionType,
			},
		});

		res.status(201).json({
			message: "Session logged successfully",
			log,
		});
	} catch (error) {
		console.error("Error logging session:", error);
		res.status(500).json({
			message: "Failed to log session",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
};

// GET /activity/live/active
export const getActiveLiveSession = async (
	req: AuthenticatedRequest,
	res: Response
): Promise<void> => {
	try {
		const userId = getUserId(req, res);
		if (!userId) return;

		const session = focusLiveSessionRegistry.getActive(userId);
		res.status(200).json({
			message: session ? "Active focus session fetched" : "No active focus session",
			session,
		});
	} catch (error) {
		handleFocusSessionError(error, res);
	}
};

// POST /activity/live/start
export const startLiveSession = async (
	req: AuthenticatedRequest,
	res: Response
): Promise<void> => {
	try {
		const userId = getUserId(req, res);
		if (!userId) return;

		const validation = startFocusLiveSessionSchema.safeParse(req.body);
		if (!validation.success) {
			res.status(400).json({
				message: "Invalid payload",
				errors: validation.error.flatten()
			});
			return;
		}

		const body = validation.data;
		const task = await prisma.task.findFirst({
			where: { id: body.taskId, userId },
			select: { id: true, title: true },
		});

		if (!task) {
			res.status(404).json({ message: "Task not found" });
			return;
		}

		const session = focusLiveSessionRegistry.start({
			userId,
			taskId: task.id,
			taskTitle: body.taskTitle || task.title,
			plannedDurationMinutes: body.plannedDurationMinutes,
			sessionType: body.sessionType as any,
			...(body.deviceId && { deviceId: body.deviceId }),
			...(body.source && { source: body.source }),
			...(body.recommendedStart && { recommendedStart: body.recommendedStart }),
			...(body.recommendedEnd && { recommendedEnd: body.recommendedEnd }),
		});

		res.status(201).json({
			message: "Live focus session started",
			session,
		});
	} catch (error) {
		handleFocusSessionError(error, res);
	}
};

// PATCH /activity/live/pause
export const pauseLiveSession = async (
	req: AuthenticatedRequest,
	res: Response
): Promise<void> => {
	try {
		const userId = getUserId(req, res);
		if (!userId) return;

		const validation = focusLiveSignalSchema.safeParse(req.body);
		if (!validation.success) {
			res.status(400).json({ message: "Invalid payload", errors: validation.error.flatten() });
			return;
		}

		const session = focusLiveSessionRegistry.pause(
			userId,
			validation.data.sessionId,
			validation.data.deviceId
		);

		res.status(200).json({ message: "Live focus session paused", session });
	} catch (error) {
		handleFocusSessionError(error, res);
	}
};

// PATCH /activity/live/resume
export const resumeLiveSession = async (
	req: AuthenticatedRequest,
	res: Response
): Promise<void> => {
	try {
		const userId = getUserId(req, res);
		if (!userId) return;

		const validation = focusLiveSignalSchema.safeParse(req.body);
		if (!validation.success) {
			res.status(400).json({ message: "Invalid payload", errors: validation.error.flatten() });
			return;
		}

		const session = focusLiveSessionRegistry.resume(
			userId,
			validation.data.sessionId,
			validation.data.deviceId
		);

		res.status(200).json({ message: "Live focus session resumed", session });
	} catch (error) {
		handleFocusSessionError(error, res);
	}
};

// PATCH /activity/live/heartbeat
export const heartbeatLiveSession = async (
	req: AuthenticatedRequest,
	res: Response
): Promise<void> => {
	try {
		const userId = getUserId(req, res);
		if (!userId) return;

		const validation = focusLiveHeartbeatSchema.safeParse(req.body);
		if (!validation.success) {
			res.status(400).json({ message: "Invalid payload", errors: validation.error.flatten() });
			return;
		}

		const session = focusLiveSessionRegistry.heartbeat(userId, validation.data.sessionId, {
			...(typeof validation.data.remainingSeconds === "number" && {
				remainingSeconds: validation.data.remainingSeconds,
			}),
			...(validation.data.deviceId && { deviceId: validation.data.deviceId }),
		});

		res.status(200).json({ message: "Heartbeat received", session });
	} catch (error) {
		handleFocusSessionError(error, res);
	}
};

// PATCH /activity/live/stop
export const stopLiveSession = async (
	req: AuthenticatedRequest,
	res: Response
): Promise<void> => {
	try {
		const userId = getUserId(req, res);
		if (!userId) return;

		const validation = stopFocusLiveSessionSchema.safeParse(req.body);
		if (!validation.success) {
			res.status(400).json({ message: "Invalid payload", errors: validation.error.flatten() });
			return;
		}

		const stopped = focusLiveSessionRegistry.stop(
			userId,
			validation.data.sessionId,
			validation.data.outcome
		);

		let log = null;
		if (stopped.elapsedSeconds >= MIN_LOGGABLE_SECONDS) {
			log = await prisma.activityLog.create({
				data: {
					taskId: stopped.session.taskId,
					startTime: stopped.startTime,
					endTime: stopped.endTime,
					durationMinutes: stopped.durationMinutes,
					sessionType: normalizeSessionType(stopped.session.sessionType),
				},
			});
		}

		res.status(200).json({
			message: "Live focus session stopped",
			session: stopped.session,
			...(log && { log }),
		});
	} catch (error) {
		handleFocusSessionError(error, res);
	}
};
