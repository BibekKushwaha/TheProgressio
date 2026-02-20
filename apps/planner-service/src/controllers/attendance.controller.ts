import type { Response } from "express";
import { prisma, AttendanceStatus, AttendanceMethod } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { TryCatch } from "../utils/tryCatch.js";
import ErrorHandler from "../utils/errorHandler.js";
import { z } from "zod";
import { logAuditAction } from "../services/audit.service.js";

const markAttendanceSchema = z.object({
  qrCode: z.string().optional(),
  status: z.nativeEnum(AttendanceStatus).default(AttendanceStatus.PRESENT),
  method: z.nativeEnum(AttendanceMethod).default(AttendanceMethod.QR),
  location: z.string().optional(),
});

export const markAttendance = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const result = markAttendanceSchema.safeParse(req.body);
  if (!result.success) {
    throw new ErrorHandler(400, "Invalid attendance data");
  }

  const { status, method, location } = result.data;

  // For QR, we could validate the code against a session, but for now we'll just log it
  const attendance = await prisma.attendance.create({
    data: {
      userId,
      status,
      method,
      location: location || "Campus",
      date: new Date(),
    }
  });

  void logAuditAction(userId, "ATTENDANCE_MARKED", "ATTENDANCE", attendance.id, JSON.stringify({ status, method, location }));

  return res.status(201).json({
    message: "Attendance marked successfully",
    attendance
  });
});

export const getAttendanceHistory = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { limit = 30 } = req.query;

  const history = await prisma.attendance.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: Number(limit),
  });

  return res.status(200).json({
    message: "Attendance history retrieved",
    history
  });
});
