import type { Request, Response } from "express";
import { prisma } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { predictTaskDuration, getCycleTimePercentiles } from "../services/prediction.service.js";
import { generateSWOT, getSubjectPerformance } from "../services/swot.service.js";
import { calculateCGPA, whatIfGPA, addCourseGrade, updateCourseGrade, deleteCourseGrade } from "../services/gpa.service.js";
import { getPlannedVsActual, detectPeakProductivity, getPredictivePerformance } from "../services/focus.service.js";

const startOfDay = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const formatDateKey = (date: Date): string => {
    return date.toISOString().split("T")[0]!;
};

// Daily Summary - GET /stats/daily
export const getDailySummary = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;
        const dailyGoalHours = req.user?.dailyGoalHours ?? 0;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { days = "1" } = req.query;
        const daysNum = parseInt(days as string) || 1;

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const start = startOfDay(new Date());
        start.setDate(start.getDate() - (daysNum - 1));

        const summary = await prisma.activityLog.aggregate({
            _sum: { durationMinutes: true },
            where: {
                task: { userId },
                startTime: { gte: start, lte: end },
            },
        });

        const breakdown = await prisma.activityLog.groupBy({
            by: ['sessionType'],
            _sum: { durationMinutes: true },
            where: {
                task: { userId },
                startTime: { gte: start, lte: end },
            },
        });

        const totalMinutes = summary._sum.durationMinutes ?? 0;
        const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
        const totalTasksCompleted = await prisma.taskCompletionStat.count({
            where: {
                userId,
                completedAt: { gte: start, lte: end },
            },
        });

        res.status(200).json({
            message: "Summary fetched successfully",
            stats: {
                totalMinutes,
                totalHours,
                totalTasksCompleted,
                dailyGoalHours: dailyGoalHours * daysNum,
                remainingHours: Math.max(0, (dailyGoalHours * daysNum) - totalHours),
                breakdown: breakdown.map(item => ({
                    type: item.sessionType,
                    minutes: item._sum.durationMinutes || 0,
                    percentage: totalMinutes > 0 ? Math.round(((item._sum.durationMinutes || 0) / totalMinutes) * 100) : 0
                }))
            },
        });
    } catch (error) {
        console.error("Error fetching summary:", error);
        res.status(500).json({
            message: "Failed to fetch summary",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Weekly Trends - GET /stats/weekly
export const getWeeklyTrends = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { taskId } = req.query;
        const today = startOfDay(new Date());
        const start = new Date(today);
        start.setDate(today.getDate() - 6);

        const logs = await prisma.activityLog.findMany({
            where: {
                task: {
                    userId,
                    ...(taskId ? { id: taskId as string } : {}),
                },
                startTime: { gte: start },
            },
            select: { startTime: true, durationMinutes: true },
        });

        const taskStats = await prisma.taskCompletionStat.findMany({
            where: {
                userId,
                completedAt: { gte: start },
            },
            select: { completedAt: true },
        });

        const taskCounts = new Map<string, number>();
        const totals = new Map<string, number>();
        for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            const key = formatDateKey(day);
            totals.set(key, 0);
            taskCounts.set(key, 0);
        }

        for (const log of logs) {
            const key = formatDateKey(startOfDay(log.startTime));
            const current = totals.get(key) ?? 0;
            totals.set(key, current + (log.durationMinutes ?? 0));
        }

        for (const stat of taskStats) {
            const key = formatDateKey(startOfDay(stat.completedAt));
            const current = taskCounts.get(key) ?? 0;
            taskCounts.set(key, current + 1);
        }

        const data = Array.from(totals.entries()).map(([date, minutes]) => ({
            date,
            day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
            minutes,
            hours: Math.round((minutes / 60) * 10) / 10,
            tasks: taskCounts.get(date) ?? 0,
        }));

        res.status(200).json({
            message: "Weekly trends fetched successfully",
            data,
        });
    } catch (error) {
        console.error("Error fetching weekly trends:", error);
        res.status(500).json({
            message: "Failed to fetch weekly trends",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Task Efficiency - GET /stats/task/:id
export const getTaskEfficiency = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (!id || typeof id !== "string") {
            res.status(400).json({ message: "Task ID is required" });
            return;
        }

        const task = await prisma.task.findFirst({
            where: { id, userId },
            include: { activityLogs: true },
        });

        if (!task) {
            res.status(404).json({ message: "Task not found" });
            return;
        }

        const totalMinutes = task.activityLogs.reduce(
            (sum, log) => sum + (log.durationMinutes ?? 0),
            0
        );

        const similarTasks = await prisma.task.findMany({
            where: {
                userId,
                title: task.title,
                status: "COMPLETED",
            },
            include: { activityLogs: true },
        });

        const averageMinutes =
            similarTasks.length > 0
                ? Math.round(
                    similarTasks.reduce((sum, t) => {
                        const minutes = t.activityLogs.reduce(
                            (innerSum, log) =>
                                innerSum + (log.durationMinutes ?? 0),
                            0
                        );
                        return sum + minutes;
                    }, 0) / similarTasks.length
                )
                : null;

        res.status(200).json({
            message: "Task efficiency fetched successfully",
            stats: {
                taskId: task.id,
                title: task.title,
                status: task.status,
                totalMinutes,
                totalHours: Math.round((totalMinutes / 60) * 10) / 10,
                predictedMinutes: averageMinutes,
            },
        });
    } catch (error) {
        console.error("Error fetching task efficiency:", error);
        res.status(500).json({
            message: "Failed to fetch task efficiency",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Focus Score - GET /stats/focus
export const getFocusScore = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;
        const dailyGoalHours = req.user?.dailyGoalHours ?? 4;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 7);
        start.setHours(0, 0, 0, 0);

        const sessions = await prisma.activityLog.findMany({
            where: {
                task: { userId },
                startTime: { gte: start, lt: end },
            },
            select: {
                durationMinutes: true,
                sessionType: true,
                startTime: true
            },
        });

        const totalSessions = sessions.length;
        if (totalSessions === 0) {
            res.status(200).json({
                message: "No data found for focus score",
                stats: { score: 0, totalSessions: 0, totalMinutes: 0, activeDays: 0 }
            });
            return;
        }

        const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);

        // 1. Consistency (40 points) - Days active in last 7 days
        const activeDaysSet = new Set(sessions.map(s => formatDateKey(s.startTime)));
        const activeDaysCount = activeDaysSet.size;
        const consistencyScore = (activeDaysCount / 7) * 40;

        // 2. Intensity (30 points) - Avg hours vs Daily Goal
        const avgHoursPerDay = (totalMinutes / 60) / 7;
        const intensityScore = Math.min(30, (avgHoursPerDay / dailyGoalHours) * 30);

        // 3. Depth (30 points) - Percentage of sessions that are DEEP_WORK
        const deepWorkSessionsCount = sessions.filter(s => s.sessionType === 'DEEP_WORK').length;
        const depthScore = (deepWorkSessionsCount / totalSessions) * 30;

        const finalScore = Math.min(100, Math.round(consistencyScore + intensityScore + depthScore));

        res.status(200).json({
            message: "Focus score calculated successfully",
            stats: {
                score: finalScore,
                breakdown: {
                    consistency: Math.round(consistencyScore),
                    intensity: Math.round(intensityScore),
                    depth: Math.round(depthScore)
                },
                totalSessions,
                totalMinutes,
                activeDays: activeDaysCount,
                avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10
            },
        });
    } catch (error) {
        console.error("Error calculating focus score:", error);
        res.status(500).json({
            message: "Failed to calculate focus score",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// User Streak - GET /stats/streak
export const getUserStreak = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const activityLogs = await prisma.activityLog.findMany({
            where: {
                task: { userId }
            },
            select: { startTime: true },
            orderBy: { startTime: 'desc' }
        });

        if (activityLogs.length === 0) {
            res.status(200).json({ streak: 0, activeDates: [] });
            return;
        }

        // Get unique dates in YYYY-MM-DD format
        const distinctDates = Array.from(new Set(activityLogs.map(log => formatDateKey(log.startTime))));

        const today = formatDateKey(new Date());
        const yesterday = formatDateKey(new Date(Date.now() - 86400000));

        // If the latest activity isn't today or yesterday, the streak is broken
        if (distinctDates[0] !== today && distinctDates[0] !== yesterday) {
            res.status(200).json({ streak: 0, activeDates: distinctDates.slice(0, 14) });
            return;
        }

        let streak = 0;
        let checkDate = new Date(distinctDates[0]!); // Start from the most recent activity date

        for (const dateStr of distinctDates) {
            const expectedDateStr = formatDateKey(checkDate);
            if (dateStr === expectedDateStr) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        res.status(200).json({
            streak,
            activeDates: distinctDates.slice(0, 14)
        });
    } catch (error) {
        console.error("Error calculating user streak:", error);
        res.status(500).json({
            message: "Failed to calculate streak",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Achievements - GET /stats/achievements
export const getAchievements = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // 1. Fetch user data for calculation
        const sessions = await prisma.activityLog.findMany({
            where: { task: { userId } },
            select: { durationMinutes: true, startTime: true }
        });

        // Get current streak (reusing logic or simplified)
        const distinctDates = Array.from(new Set(sessions.map(s => formatDateKey(s.startTime!))));
        let streak = 0;
        if (distinctDates.length > 0) {
            const today = formatDateKey(new Date());
            const yesterday = formatDateKey(new Date(Date.now() - 86400000));
            if (distinctDates[0] === today || distinctDates[0] === yesterday) {
                let checkDate = new Date(distinctDates[0]!);
                for (const dateStr of distinctDates) {
                    if (dateStr === formatDateKey(checkDate)) {
                        streak++;
                        checkDate.setDate(checkDate.getDate() - 1);
                    } else break;
                }
            }
        }

        const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
        const maxSessionTime = sessions.reduce((max, s) => Math.max(max, s.durationMinutes ?? 0), 0);
        const totalSessions = sessions.length;

        // 2. Fetch all achievement definitions
        const definitions = await prisma.achievement.findMany();

        // 3. Fetch already unlocked achievements
        const unlocked = await prisma.userAchievement.findMany({
            where: { userId },
            select: { achievementId: true, unlockedAt: true }
        });
        const unlockedIds = new Set(unlocked.map((u: { achievementId: string }) => u.achievementId));

        // 4. Check for new unlocks
        const results = definitions.map((def: any) => {
            const isUnlocked = unlockedIds.has(def.id);
            let progress = 0;
            let currentUnlocked = isUnlocked;

            switch (def.type) {
                case 'FOCUS': progress = (totalSessions / def.goalValue) * 100; break;
                case 'STREAK': progress = (streak / def.goalValue) * 100; break;
                case 'TIME': progress = (totalMinutes / def.goalValue) * 100; break;
                case 'SESSION': progress = (maxSessionTime / def.goalValue) * 100; break;
            }

            progress = Math.min(100, Math.round(progress));

            if (!isUnlocked && progress >= 100) {
                // This could be moved to a separate "check" step or done here
                // For now, we'll return it as "just unlocked" logic
                currentUnlocked = true;
            }

            const unlockedInfo = unlocked.find((u: { achievementId: string; unlockedAt: Date }) => u.achievementId === def.id);

            return {
                ...def,
                unlocked: currentUnlocked,
                progress,
                unlockedAt: unlockedInfo?.unlockedAt
            };
        });

        // Sync with DB for newly unlocked ones
        const newlyUnlocked = results.filter((r: any) => r.unlocked && !unlockedIds.has(r.id));
        if (newlyUnlocked.length > 0) {
            await prisma.userAchievement.createMany({
                data: newlyUnlocked.map((a: any) => ({
                    userId,
                    achievementId: a.id
                }))
            });
        }

        res.status(200).json({
            message: "Achievements retrieved successfully",
            achievements: results
        });
    } catch (error) {
        console.error("Error fetching achievements:", error);
        res.status(500).json({
            message: "Failed to fetch achievements",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Event Handler - POST /events/task-completed
export const handleTaskCompletedEvent = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { type, taskId } = req.body ?? {};

        if (type !== "TASK_COMPLETED" || !taskId || typeof taskId !== "string") {
            res.status(400).json({ message: "Invalid event payload" });
            return;
        }

        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { activityLogs: true },
        });

        if (!task) {
            res.status(404).json({ message: "Task not found" });
            return;
        }

        const totalMinutes = task.activityLogs.reduce(
            (sum, log) => sum + (log.durationMinutes ?? 0),
            0
        );

        const completionStat = await prisma.taskCompletionStat.upsert({
            where: { taskId: task.id },
            create: {
                taskId: task.id,
                userId: task.userId,
                totalMinutes,
                completedAt: new Date(),
            },
            update: {
                totalMinutes,
                completedAt: new Date(),
            },
        });

        res.status(200).json({
            message: "Task completion processed",
            stats: {
                taskId: task.id,
                title: task.title,
                totalMinutes,
                totalHours: Math.round((totalMinutes / 60) * 10) / 10,
            },
            completionStat,
        });
    } catch (error) {
        console.error("Error processing task completion event:", error);
        res.status(500).json({
            message: "Failed to process task completion event",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// Phase 3 — Duration Prediction (PERT)
// ═══════════════════════════════════════════════════════════════════════

// GET /stats/predict
export const getPrediction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { categoryId, subject, taskId } = req.query;
        const prediction = await predictTaskDuration(userId, {
            ...(categoryId ? { categoryId: categoryId as string } : {}),
            ...(subject ? { subjectId: subject as string } : {}),
            ...(taskId ? { taskTitle: taskId as string } : {}),
        });

        res.status(200).json({ message: "Prediction generated", prediction });
    } catch (error) {
        console.error("Error generating prediction:", error);
        res.status(500).json({ message: "Failed to generate prediction", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// GET /stats/cycle-time
export const getCycleTime = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { categoryId, subject } = req.query;
        const data = await getCycleTimePercentiles(userId, {
            ...(categoryId ? { categoryId: categoryId as string } : {}),
            ...(subject ? { subjectId: subject as string } : {}),
        });

        res.status(200).json({ message: "Cycle time percentiles", data });
    } catch (error) {
        console.error("Error fetching cycle time:", error);
        res.status(500).json({ message: "Failed to fetch cycle time", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// Phase 3 — SWOT Analysis
// ═══════════════════════════════════════════════════════════════════════

// GET /stats/swot/:examType
export const getSWOTAnalysis = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { examType } = req.params;
        if (!examType) { res.status(400).json({ message: "examType is required" }); return; }

        const raw = await generateSWOT(userId, examType as string);

        // Normalize service response to UI/store contract shape.
        const swot = {
            examType: raw.examType,
            overallReadiness: raw.overallReadiness,
            topPriorityChapters: raw.topPriorityChapters.map((chapter) => chapter.chapter),
            subjects: raw.subjects.map((subject) => ({
                subject: subject.subjectName,
                strengths: subject.strengths.map((item) => ({
                    chapter: item.chapter,
                    score: item.successRate,
                })),
                weaknesses: subject.weaknesses.map((item) => ({
                    chapter: item.chapter,
                    score: item.successRate,
                })),
                opportunities: subject.opportunities.map((item) => ({
                    chapter: item.chapter,
                    score: item.successRate,
                    reason: item.avgTimePerQuestion > 0
                        ? `Avg time/question: ${item.avgTimePerQuestion} mins`
                        : "Moderate score with room for improvement",
                })),
                threats: subject.threats.map((item) => ({
                    chapter: item.chapter,
                    score: item.successRate,
                    reason: item.avgTimePerQuestion > 0
                        ? `Low score and avg time/question: ${item.avgTimePerQuestion} mins`
                        : "Low score needs immediate attention",
                })),
            })),
        };

        res.status(200).json({ message: "SWOT analysis generated", swot });
    } catch (error) {
        console.error("Error generating SWOT:", error);
        res.status(500).json({ message: "Failed to generate SWOT", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// GET /stats/subject/:name
export const getSubjectStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { name } = req.params;
        if (!name) { res.status(400).json({ message: "Subject name is required" }); return; }

        const data = await getSubjectPerformance(userId, decodeURIComponent(name as string));
        res.status(200).json({ message: "Subject performance fetched", data });
    } catch (error) {
        console.error("Error fetching subject stats:", error);
        res.status(500).json({ message: "Failed to fetch subject stats", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// Phase 3 — GPA Calculator
// ═══════════════════════════════════════════════════════════════════════

// GET /stats/gpa
export const getGPA = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const scale = (req.query.scale as string) || "INDIA_10";
        const raw = await calculateCGPA(userId, scale as "INDIA_10" | "US_4" | "PERCENTAGE");
        const normalizedRaw = raw as typeof raw & {
            cgpa?: number;
            semesterBreakdown?: Array<{ semester: number; gpa: number; credits?: number; totalCredits?: number }>;
            courses?: Array<{ courseName: string; credits: number; gradePoint: number; grade?: string | null; semester?: number }>;
        };

        const semesterBreakdown = normalizedRaw.semesters
            ? normalizedRaw.semesters.map((sem) => ({
                semester: sem.semester,
                gpa: sem.gpa,
                credits: sem.totalCredits,
            }))
            : (normalizedRaw.semesterBreakdown ?? []).map((sem) => ({
                semester: sem.semester,
                gpa: sem.gpa,
                credits: sem.credits ?? sem.totalCredits ?? 0,
            }));

        const courses = normalizedRaw.courses
            ? normalizedRaw.courses
            : (normalizedRaw.semesters ?? []).flatMap((sem) =>
                sem.courses.map((course) => ({
                    courseName: course.courseName,
                    credits: course.credits,
                    gradePoint: course.gradePoint,
                    grade: course.grade ?? undefined,
                    semester: sem.semester,
                }))
            );

        // Normalize service response to UI/store contract shape.
        const result = {
            cgpa: normalizedRaw.currentCGPA ?? normalizedRaw.cgpa ?? 0,
            totalCredits: normalizedRaw.totalCredits ?? 0,
            semesterBreakdown,
            courses,
        };

        res.status(200).json({ message: "CGPA calculated", result });
    } catch (error) {
        console.error("Error calculating GPA:", error);
        res.status(500).json({ message: "Failed to calculate GPA", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// POST /stats/gpa/what-if
export const getWhatIfGPA = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { targetCGPA, remainingCredits, scale } = req.body ?? {};
        if (!targetCGPA || !remainingCredits) {
            res.status(400).json({ message: "targetCGPA and remainingCredits are required" });
            return;
        }

        const result = await whatIfGPA(userId, parseFloat(targetCGPA), parseInt(remainingCredits), scale || "INDIA_10");
        res.status(200).json({ message: "What-if result", result });
    } catch (error) {
        console.error("Error in what-if GPA:", error);
        res.status(500).json({ message: "Failed to calculate what-if GPA", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// POST /stats/gpa/course
export const addCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { courseName, credits, gradePoint, grade, semester } = req.body ?? {};
        if (!courseName || credits == null || gradePoint == null) {
            res.status(400).json({ message: "courseName, credits, and gradePoint are required" });
            return;
        }

        const course = await addCourseGrade(userId, {
            courseName,
            credits: parseFloat(credits),
            gradePoint: parseFloat(gradePoint),
            grade,
            ...(semester ? { semester: parseInt(semester) } : {}),
        });
        res.status(201).json({ message: "Course added", course });
    } catch (error) {
        console.error("Error adding course:", error);
        res.status(500).json({ message: "Failed to add course", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// PUT /stats/gpa/course/:id
export const updateCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { id } = req.params;
        const course = await updateCourseGrade((id as string)!, userId, req.body);
        res.status(200).json({ message: "Course updated", course });
    } catch (error) {
        console.error("Error updating course:", error);
        res.status(500).json({ message: "Failed to update course", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// DELETE /stats/gpa/course/:id
export const deleteCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { id } = req.params;
        await deleteCourseGrade((id as string)!, userId);
        res.status(200).json({ message: "Course deleted" });
    } catch (error) {
        console.error("Error deleting course:", error);
        res.status(500).json({ message: "Failed to delete course", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// Phase 3 — Grade Entries (for SWOT / Predictive)
// ═══════════════════════════════════════════════════════════════════════

// POST /stats/grade-entry
export const addGradeEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { subjectName, chapter, totalMarks, obtainedMarks, examType, timeTakenMins } = req.body ?? {};
        if (!subjectName || totalMarks == null || obtainedMarks == null) {
            res.status(400).json({ message: "subjectName, totalMarks, and obtainedMarks are required" });
            return;
        }

        const entry = await prisma.gradeEntry.create({
            data: {
                userId, subjectName, chapter, totalMarks: parseFloat(totalMarks), obtainedMarks: parseFloat(obtainedMarks),
                examType: examType || "JEE", timeTakenMins: timeTakenMins ? parseInt(timeTakenMins) : null,
            },
        });
        res.status(201).json({ message: "Grade entry added", entry });
    } catch (error) {
        console.error("Error adding grade entry:", error);
        res.status(500).json({ message: "Failed to add grade entry", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// GET /stats/grade-entries
export const getGradeEntries = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { examType, subject } = req.query;
        const entries = await prisma.gradeEntry.findMany({
            where: {
                userId,
                ...(examType ? { examType: examType as string } : {}),
                ...(subject ? { subjectName: subject as string } : {}),
            },
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json({ message: "Grade entries fetched", entries });
    } catch (error) {
        console.error("Error fetching grade entries:", error);
        res.status(500).json({ message: "Failed to fetch grade entries", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// DELETE /stats/grade-entry/:id
export const deleteGradeEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { id } = req.params;
        await prisma.gradeEntry.deleteMany({ where: { id: (id as string)!, userId } });
        res.status(200).json({ message: "Grade entry deleted" });
    } catch (error) {
        console.error("Error deleting grade entry:", error);
        res.status(500).json({ message: "Failed to delete grade entry", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// Phase 3 — Focus / Time Leakage
// ═══════════════════════════════════════════════════════════════════════

// GET /stats/focus/leakage
export const getTimeLeakage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const days = parseInt(req.query.days as string) || 14;
        const report = await getPlannedVsActual(userId, days);
        res.status(200).json({ message: "Time leakage report", report });
    } catch (error) {
        console.error("Error fetching leakage:", error);
        res.status(500).json({ message: "Failed to fetch leakage report", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// GET /stats/focus/peak-window
export const getPeakWindow = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const days = parseInt(req.query.days as string) || 30;
        const data = await detectPeakProductivity(userId, days);
        res.status(200).json({ message: "Peak productivity window", data });
    } catch (error) {
        console.error("Error detecting peak window:", error);
        res.status(500).json({ message: "Failed to detect peak window", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// GET /stats/performance/:examType
export const getPredictivePerformanceEndpoint = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { examType } = req.params;
        if (!examType) { res.status(400).json({ message: "examType is required" }); return; }

        const data = await getPredictivePerformance(userId, examType as string);
        res.status(200).json({ message: "Predictive performance", data });
    } catch (error) {
        console.error("Error fetching predictive performance:", error);
        res.status(500).json({ message: "Failed to fetch predictive performance", error: error instanceof Error ? error.message : "Unknown error" });
    }
};
