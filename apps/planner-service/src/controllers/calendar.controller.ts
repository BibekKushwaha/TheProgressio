import type { Response } from "express";
import { prisma } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { timetableService } from "../services/timetable.service.js";
import { TryCatch } from "../utils/tryCatch.js";
import ErrorHandler from "../utils/errorHandler.js";

// Helpers
const toLocalIsoDate = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const parseYMDToLocalDate = (raw: string): Date | null => {
    const parts = raw.split('-');
    if (parts.length !== 3) return null;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (![y, m, d].every(Number.isFinite)) return null;
    return new Date(y, m - 1, d);
};

export const getMonthlyEvents = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { month, year } = req.query;

    if (!month || !year) {
        throw new ErrorHandler(400, "Month and Year are required");
    }

    const monthInt = parseInt(month as string);
    const yearInt = parseInt(year as string);

    if (isNaN(monthInt) || isNaN(yearInt) || monthInt < 1 || monthInt > 12) {
        throw new ErrorHandler(400, "Invalid month or year");
    }

    // Start of month (local)
    const startDate = new Date(yearInt, monthInt - 1, 1, 0, 0, 0, 0);
    // End of month (local)
    const endDate = new Date(yearInt, monthInt, 0, 23, 59, 59, 999);

    // Fetch ALL Tasks due in this month (no grouping in DB to avoid DateTime issues)
    const tasks = await prisma.task.findMany({
        where: {
            userId,
            dueDate: {
                gte: startDate,
                lte: endDate
            }
        },
        select: {
            id: true,
            dueDate: true
        }
    });

    // Fetch ALL Exams in this month
    const exams = await prisma.exam.findMany({
        where: {
            userId,
            date: {
                gte: startDate,
                lte: endDate
            }
        },
        select: {
            id: true,
            date: true
        }
    });

    // Aggregate in memory
    const eventMap: Record<string, { taskCount: number; examCount: number }> = {};

    tasks.forEach(task => {
        if (task.dueDate) {
            const dateKey = toLocalIsoDate(task.dueDate);
            if (!eventMap[dateKey]) eventMap[dateKey] = { taskCount: 0, examCount: 0 };
            eventMap[dateKey].taskCount++;
        }
    });

    exams.forEach((exam) => {
        if (exam.date) {
            const dateKey = toLocalIsoDate(exam.date);
            if (!eventMap[dateKey]) eventMap[dateKey] = { taskCount: 0, examCount: 0 };
            eventMap[dateKey].examCount++;
        }
    });

    return res.status(200).json(eventMap);
});

export const getDailySchedule = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { date } = req.query;

    if (!date) {
        throw new ErrorHandler(400, "Date is required");
    }

    // Parse incoming YYYY-MM-DD as local date to avoid UTC shift issues
    const rawDate = String(date as string);
    const parsed = parseYMDToLocalDate(rawDate);
    if (!parsed) throw new ErrorHandler(400, "Invalid date format");
    const targetDate = parsed;

    // 1. Get Recurring Timetable Entries
    // timetableService returns { entries: [...] }
    const timetableData = await timetableService.getDailySchedule(userId, targetDate);

    // 2. Get One-off Tasks due today
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const tasks = await prisma.task.findMany({
        where: {
            userId,
            dueDate: {
                gte: startOfDay,
                lte: endOfDay
            }
        },
        include: {
            category: true,
            subject: true
        }
    });

    // 3. Get Exams today
    const exams = await prisma.exam.findMany({
        where: {
            userId,
            date: {
                gte: startOfDay,
                lte: endOfDay
            }
        },
        include: {
            subject: true
        }
    });

    // 4. Merge and Normalize
    const scheduleItems = [
        // Timetable Entries
        ...timetableData.entries.map((entry: any) => ({
            id: `timetable-${entry.id}`,
            type: 'class',
            title: entry.subject?.name || 'Class',
            subtitle: entry.subject?.room || 'No Room',
            startTime: entry.startTime,
            endTime: entry.endTime,
            color: entry.subject?.color || '#3B82F6',
            subject: entry.subject?.name || 'Unknown',
            // Add useful metadata
            category: 'Academic',
            isRecurring: true,
            rotation: entry.rotation
        })),

        // Tasks
        ...tasks.map(task => ({
            id: `task-${task.id}`,
            type: 'task',
            title: task.title,
            subtitle: task.description || 'Task',
            startTime: '00:00', // Default to start of day for sorting if no time
            endTime: '23:59',
            color: task.category?.colorCode || (task.subject as any)?.color || '#888888',
            subject: (task.subject as any)?.name,
            category: task.category?.name || 'General',
            priority: task.priority,
            status: task.status,
            isCompleted: task.status === 'COMPLETED'
        })),

        // Exams
        ...exams.map((exam) => ({
            id: `exam-${exam.id}`,
            type: 'exam',
            title: `${exam.title}`,
            subtitle: exam.location || 'Exam Hall',
            startTime: '09:00', // Needs a proper time field in DB eventually
            endTime: '11:00',
            color: '#EF4444',
            subject: exam.subject?.name || 'General',
            category: 'Exam',
            priority: exam.priority
        }))
    ];

    // Sort by start time but push flexible all-day tasks (tasks with '00:00') to the end
    const minuteOf = (time: string, type?: string) => {
        if (!time) return 24 * 60;
        // treat task all-day markers as end of day so they appear after timed classes
        if (type === 'task' && time === '00:00') return 24 * 60;
        const [hh = '0', mm = '0'] = time.split(':');
        const h = Number.parseInt(hh, 10);
        const m = Number.parseInt(mm, 10);
        if (Number.isNaN(h) || Number.isNaN(m)) return 24 * 60;
        return Math.max(0, Math.min(24 * 60, h * 60 + m));
    };

    scheduleItems.sort((a, b) => minuteOf(a.startTime, a.type) - minuteOf(b.startTime, b.type));
    return res.status(200).json({
        date: toLocalIsoDate(targetDate),
        dayOfWeek: targetDate.getDay(),
        isHoliday: timetableData.isHoliday,
        holidayName: timetableData.holidayName,
        pauseNotifications: timetableData.pauseNotifications,
        conflicts: timetableData.conflicts,
        items: scheduleItems
    });
});
