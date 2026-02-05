import type { Response } from "express";
import { prisma } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const toDate = (value: unknown): Date | undefined => {
	if (!value) return undefined;
	const date = new Date(value as string | number | Date);
	return Number.isNaN(date.getTime()) ? undefined : date;
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
							  (parsedEnd.getTime() - parsedStart.getTime()) /
								  60000
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
				sessionType,
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
