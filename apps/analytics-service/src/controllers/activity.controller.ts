import type { Response } from "express";
import { prisma, SessionType } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
	focusLiveSessionRegistry,
	FocusSessionError,
} from "../services/focus-live.service.js";

const MIN_LOGGABLE_SECONDS = 30;
const MAX_PLANNED_MINUTES = 360;

type ParsedStartPayload = {
	taskId: string;
	taskTitle?: string;
	plannedDurationMinutes: number;
	sessionType: SessionType;
	deviceId?: string;
	source?: string;
	recommendedStart?: string;
	recommendedEnd?: string;
};

type ParsedSignalPayload = {
	sessionId: string;
	deviceId?: string;
};

type ParsedHeartbeatPayload = ParsedSignalPayload & {
	remainingSeconds?: number;
};

type ParsedStopPayload = ParsedSignalPayload & {
	outcome: "COMPLETED" | "CANCELLED";
};

type ParseResult<T> =
	| { ok: true; data: T }
	| { ok: false; error: string };

const toDate = (value: unknown): Date | undefined => {
	if (!value) return undefined;
	const date = new Date(value as string | number | Date);
	return Number.isNaN(date.getTime()) ? undefined : date;
};

const normalizeSessionType = (value: unknown): SessionType => {
	if (typeof value !== "string") return SessionType.DEEP_WORK;
	if (value === SessionType.POMODORO) return SessionType.POMODORO;
	if (value === SessionType.BREAK) return SessionType.BREAK;
	return SessionType.DEEP_WORK;
};

const normalizeOptionalString = (value: unknown): string | undefined =>
	typeof value === "string" && value.trim() ? value.trim() : undefined;

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

const parseStartPayload = (payload: unknown): ParseResult<ParsedStartPayload> => {
	if (!payload || typeof payload !== "object") {
		return { ok: false, error: "Invalid live session payload" };
	}

	const body = payload as Record<string, unknown>;
	const taskId = normalizeOptionalString(body.taskId);
	if (!taskId) return { ok: false, error: "taskId is required" };

	const rawDuration =
		typeof body.plannedDurationMinutes === "number"
			? body.plannedDurationMinutes
			: 25;

	if (!Number.isFinite(rawDuration) || rawDuration < 1) {
		return { ok: false, error: "plannedDurationMinutes must be >= 1" };
	}

	const parsed: ParsedStartPayload = {
		taskId,
		plannedDurationMinutes: Math.min(
			MAX_PLANNED_MINUTES,
			Math.max(1, Math.round(rawDuration))
		),
		sessionType: normalizeSessionType(body.sessionType),
	};

	const taskTitle = normalizeOptionalString(body.taskTitle);
	const deviceId = normalizeOptionalString(body.deviceId);
	const source = normalizeOptionalString(body.source);
	const recommendedStart = normalizeOptionalString(body.recommendedStart);
	const recommendedEnd = normalizeOptionalString(body.recommendedEnd);

	if (taskTitle) parsed.taskTitle = taskTitle;
	if (deviceId) parsed.deviceId = deviceId;
	if (source) parsed.source = source;
	if (recommendedStart) parsed.recommendedStart = recommendedStart;
	if (recommendedEnd) parsed.recommendedEnd = recommendedEnd;

	return { ok: true, data: parsed };
};

const parseSignalPayload = (payload: unknown): ParseResult<ParsedSignalPayload> => {
	if (!payload || typeof payload !== "object") {
		return { ok: false, error: "Invalid signal payload" };
	}

	const body = payload as Record<string, unknown>;
	const sessionId = normalizeOptionalString(body.sessionId);
	if (!sessionId) return { ok: false, error: "sessionId is required" };

	const parsed: ParsedSignalPayload = { sessionId };
	const deviceId = normalizeOptionalString(body.deviceId);
	if (deviceId) parsed.deviceId = deviceId;

	return { ok: true, data: parsed };
};

const parseHeartbeatPayload = (
	payload: unknown
): ParseResult<ParsedHeartbeatPayload> => {
	const base = parseSignalPayload(payload);
	if (!base.ok) return base;

	const body = payload as Record<string, unknown>;
	if (
		body.remainingSeconds !== undefined &&
		(typeof body.remainingSeconds !== "number" || body.remainingSeconds < 0)
	) {
		return { ok: false, error: "remainingSeconds must be a non-negative number" };
	}

	const parsed: ParsedHeartbeatPayload = { ...base.data };
	if (typeof body.remainingSeconds === "number") {
		parsed.remainingSeconds = Math.round(body.remainingSeconds);
	}

	return { ok: true, data: parsed };
};

const parseStopPayload = (payload: unknown): ParseResult<ParsedStopPayload> => {
	const base = parseSignalPayload(payload);
	if (!base.ok) return base;

	const body = payload as Record<string, unknown>;
	const parsed: ParsedStopPayload = {
		...base.data,
		outcome: body.outcome === "CANCELLED" ? "CANCELLED" : "COMPLETED",
	};

	return { ok: true, data: parsed };
};

// Log Session - POST /activity/log
export const logSession = async (
	req: AuthenticatedRequest,
	res: Response
): Promise<void> => {
	try {
		const userId = req.user?.id;
		const { taskId, startTime, endTime, durationMinutes, sessionType } =
			req.body ?? {};

		if (!userId) {
			res.status(401).json({ message: "Unauthorized" });
			return;
		}

		if (!taskId || typeof taskId !== "string") {
			res.status(400).json({ message: "taskId is required" });
			return;
		}

		const task = await prisma.task.findFirst({
			where: { id: taskId, userId },
		});

		if (!task) {
			res.status(404).json({ message: "Task not found" });
			return;
		}

		const parsedStart = toDate(startTime) ?? new Date();
		const parsedEnd = toDate(endTime);
		const computedDuration =
			typeof durationMinutes === "number"
				? durationMinutes
				: parsedEnd
					? Math.max(
						  1,
						  Math.round(
							  (parsedEnd.getTime() - parsedStart.getTime()) / 60000
						  )
					  )
					: undefined;

		if (!computedDuration) {
			res.status(400).json({
				message: "durationMinutes or valid endTime is required",
			});
			return;
		}

		const log = await prisma.activityLog.create({
			data: {
				taskId,
				startTime: parsedStart,
				...(parsedEnd ? { endTime: parsedEnd } : {}),
				durationMinutes: computedDuration,
				sessionType: normalizeSessionType(sessionType),
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

		const parsed = parseStartPayload(req.body ?? {});
		if (!parsed.ok) {
			res.status(400).json({ message: parsed.error });
			return;
		}

		const body = parsed.data;
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
			sessionType: body.sessionType,
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

		const parsed = parseSignalPayload(req.body ?? {});
		if (!parsed.ok) {
			res.status(400).json({ message: parsed.error });
			return;
		}

		const session = focusLiveSessionRegistry.pause(
			userId,
			parsed.data.sessionId,
			parsed.data.deviceId
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

		const parsed = parseSignalPayload(req.body ?? {});
		if (!parsed.ok) {
			res.status(400).json({ message: parsed.error });
			return;
		}

		const session = focusLiveSessionRegistry.resume(
			userId,
			parsed.data.sessionId,
			parsed.data.deviceId
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

		const parsed = parseHeartbeatPayload(req.body ?? {});
		if (!parsed.ok) {
			res.status(400).json({ message: parsed.error });
			return;
		}

		const session = focusLiveSessionRegistry.heartbeat(userId, parsed.data.sessionId, {
			...(typeof parsed.data.remainingSeconds === "number" && {
				remainingSeconds: parsed.data.remainingSeconds,
			}),
			...(parsed.data.deviceId && { deviceId: parsed.data.deviceId }),
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

		const parsed = parseStopPayload(req.body ?? {});
		if (!parsed.ok) {
			res.status(400).json({ message: parsed.error });
			return;
		}

		const stopped = focusLiveSessionRegistry.stop(
			userId,
			parsed.data.sessionId,
			parsed.data.outcome
		);

		let log: Awaited<ReturnType<typeof prisma.activityLog.create>> | null = null;
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
