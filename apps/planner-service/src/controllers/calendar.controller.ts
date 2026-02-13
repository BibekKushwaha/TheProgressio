import type { Response } from "express";
import { prisma } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { timetableService } from "../services/timetable.service.js";

export const getMonthlyEvents = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({ message: "Month and Year are required" });
        }

        const monthInt = parseInt(month as string);
        const yearInt = parseInt(year as string);

        // Start of month
        const startDate = new Date(yearInt, monthInt - 1, 1);
        // End of month
        const endDate = new Date(yearInt, monthInt, 0, 23, 59, 59, 999);

        // Fetch ALL Tasks due in this month (no grouping in DB to avoid DateTime issues)
        const tasks = await prisma.task.findMany({
            where: {
                userId: req.user.id,
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
                userId: req.user.id,
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
                const dateKey = task.dueDate.toISOString().split('T')[0];
                if (!dateKey) return;
                if (!eventMap[dateKey]) eventMap[dateKey] = { taskCount: 0, examCount: 0 };
                eventMap[dateKey].taskCount++;
            }
        });

        exams.forEach(exam => {
            const dateKey = exam.date.toISOString().split('T')[0];
            if (!dateKey) return;
            if (!eventMap[dateKey]) eventMap[dateKey] = { taskCount: 0, examCount: 0 };
            eventMap[dateKey].examCount++;
        });

        return res.status(200).json(eventMap);

    } catch (error) {
        console.error("Get monthly events error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getDailySchedule = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ message: "Date is required" });
        }

        const targetDate = new Date(date as string);
        if (isNaN(targetDate.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
        }

        // 1. Get Recurring Timetable Entries
        // timetableService returns { entries: [...] }
        const timetableData = await timetableService.getDailySchedule(req.user.id, targetDate);

        // 2. Get One-off Tasks due today
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const tasks = await prisma.task.findMany({
            where: {
                userId: req.user.id,
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
                userId: req.user.id,
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
            ...timetableData.entries.map(entry => ({
                id: `timetable-${entry.id}`,
                type: 'class',
                title: entry.subject.name,
                subtitle: entry.subject.room || 'No Room',
                startTime: entry.startTime,
                endTime: entry.endTime,
                color: entry.subject.color,
                subject: entry.subject.name,
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
                color: task.category?.colorCode || task.subject?.color || '#888888',
                subject: task.subject?.name,
                category: task.category?.name || 'General',
                priority: task.priority,
                status: task.status,
                isCompleted: task.status === 'COMPLETED'
            })),

            // Exams
            ...exams.map(exam => ({
                id: `exam-${exam.id}`,
                type: 'exam',
                title: `${exam.title}`,
                subtitle: exam.location || 'Exam Hall',
                startTime: '09:00', // Needs a proper time field in DB eventually
                endTime: '11:00',
                color: '#EF4444',
                subject: exam.subject.name,
                category: 'Exam',
                priority: exam.priority
            }))
        ];

        // Sort by start time
        // Note: For tasks without time (00:00), they will appear at the top. 
        // In a school planner, maybe strict time slots are better, but flexible tasks are fine too.
        scheduleItems.sort((a, b) => a.startTime.localeCompare(b.startTime));

        return res.status(200).json({
            date: targetDate.toISOString().split('T')[0],
            dayOfWeek: targetDate.getDay(),
            isHoliday: timetableData.isHoliday,
            holidayName: timetableData.holidayName,
            pauseNotifications: timetableData.pauseNotifications,
            conflicts: timetableData.conflicts,
            items: scheduleItems
        });

    } catch (error) {
        console.error("Get daily schedule error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
