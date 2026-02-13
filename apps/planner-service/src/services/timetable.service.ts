
import { prisma, type Prisma } from "@repo/db";

const MINUTES_PER_DAY = 24 * 60;
const prismaAny = prisma as any;

export interface ScheduleConflict {
    id: string;
    type: "CLASS_OVERLAP" | "EXAM_OVERLAP";
    severity: "warning" | "high";
    message: string;
    startsAt: string;
    endsAt: string;
    classEntryIds?: string[];
    examId?: string;
}

type TimetableEntryWithSubject = Prisma.TimetableGetPayload<{
    include: { subject: true };
}>;

export interface DailyScheduleResult {
    date: string;
    dayOfWeek: number;
    rotation: string;
    isHoliday: boolean;
    holidayName: string | null;
    pauseNotifications: boolean;
    conflicts: ScheduleConflict[];
    entries: TimetableEntryWithSubject[];
}

const toIsoDate = (value: Date): string => value.toISOString().split("T")[0]!;

const startOfDay = (value: Date): Date => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
};

const endOfDay = (value: Date): Date => {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
};

const toMinuteOfDay = (timeValue: string): number => {
    const [hoursPart, minutesPart] = timeValue.split(":");
    const hours = Number.parseInt(hoursPart ?? "", 10);
    const minutes = Number.parseInt(minutesPart ?? "", 10);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return 0;
    }

    return Math.max(0, Math.min(MINUTES_PER_DAY, hours * 60 + minutes));
};

const minuteToLabel = (minuteValue: number): string => {
    const normalized = ((minuteValue % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    const hour = Math.floor(normalized / 60);
    const minute = normalized % 60;
    const suffix = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${formattedHour}:${String(minute).padStart(2, "0")} ${suffix}`;
};

export class TimetableService {

    /**
     * Determines the current rotation based on the user's custom rotation pattern.
     * Falls back to algorithmic even/odd week if no custom pattern is defined.
     */
    async getRotationForDate(userId: string, date: Date): Promise<string> {
        // Try to find an active custom rotation pattern for this user
        const activePattern = await prisma.rotationPattern.findFirst({
            where: { userId, isActive: true },
            orderBy: { createdAt: "desc" },
        });

        if (activePattern) {
            const daysDiff = Math.floor(
                (date.getTime() - new Date(activePattern.startDate).getTime()) / (24 * 60 * 60 * 1000)
            );
            const cycleIndex = Math.floor(daysDiff / activePattern.cycleLengthDays);
            const patternIndex = ((cycleIndex % activePattern.pattern.length) + activePattern.pattern.length) % activePattern.pattern.length;
            return activePattern.pattern[patternIndex]!;
        }

        // Fallback: algorithmic A/B based on even/odd week of year
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDays = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const weekNumber = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);

        return weekNumber % 2 === 0 ? "B" : "A";
    }

    /**
     * Retrieves the daily schedule for a specific user and date.
     */
    async getHolidayForDate(userId: string, date: Date) {
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        return prismaAny.schoolHoliday.findFirst({
            where: {
                userId,
                startDate: { lte: dayEnd },
                endDate: { gte: dayStart },
            },
            orderBy: { startDate: "asc" },
        });
    }

    detectConflicts(params: {
        timetableEntries: TimetableEntryWithSubject[];
        exams: Awaited<ReturnType<typeof prisma.exam.findMany>>;
    }): ScheduleConflict[] {
        const conflicts: ScheduleConflict[] = [];
        const sortedEntries = [...params.timetableEntries].sort((a, b) => a.startTime.localeCompare(b.startTime));

        // Class vs class overlaps
        for (let index = 0; index < sortedEntries.length - 1; index += 1) {
            const current = sortedEntries[index]!;
            const next = sortedEntries[index + 1]!;
            const currentEnd = toMinuteOfDay(current.endTime);
            const nextStart = toMinuteOfDay(next.startTime);

            if (currentEnd > nextStart) {
                conflicts.push({
                    id: `class-overlap-${current.id}-${next.id}`,
                    type: "CLASS_OVERLAP",
                    severity: "high",
                    message: `${current.subject.name} overlaps with ${next.subject.name}`,
                    startsAt: current.startTime,
                    endsAt: next.endTime,
                    classEntryIds: [current.id, next.id],
                });
            }
        }

        // Class vs exam overlaps
        for (const entry of sortedEntries) {
            const classStartMinute = toMinuteOfDay(entry.startTime);
            const classEndMinute = toMinuteOfDay(entry.endTime);

            for (const exam of params.exams) {
                const examStartMinute = exam.date.getHours() * 60 + exam.date.getMinutes();
                const examDuration = Math.max(15, exam.durationMinutes ?? 0);
                const examEndMinute = Math.min(MINUTES_PER_DAY, examStartMinute + examDuration);

                const overlaps = classStartMinute < examEndMinute && classEndMinute > examStartMinute;
                if (!overlaps) continue;

                conflicts.push({
                    id: `exam-overlap-${entry.id}-${exam.id}`,
                    type: "EXAM_OVERLAP",
                    severity: "warning",
                    message: `${entry.subject.name} conflicts with exam "${exam.title}"`,
                    startsAt: minuteToLabel(Math.max(classStartMinute, examStartMinute)),
                    endsAt: minuteToLabel(Math.min(classEndMinute, examEndMinute)),
                    classEntryIds: [entry.id],
                    examId: exam.id,
                });
            }
        }

        return conflicts;
    }

    async getDailySchedule(userId: string, date: Date): Promise<DailyScheduleResult> {
        const dayOfWeek = date.getDay(); // 0 is Sunday
        const rotation = await this.getRotationForDate(userId, date);
        const holiday = await this.getHolidayForDate(userId, date);
        const isHoliday = Boolean(holiday);
        const pauseNotifications = holiday?.pauseNotifications ?? false;
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        // Fetch timetable entries matching the day and current rotation (or general entries)
        const entries = await prisma.timetable.findMany({
            where: {
                userId,
                dayOfWeek,
                OR: [
                    { rotation: rotation },
                    { rotation: null } // items that apply every week
                ]
            },
            include: {
                subject: true
            },
            orderBy: {
                startTime: 'asc'
            }
        });

        const exams = await prisma.exam.findMany({
            where: {
                userId,
                date: {
                    gte: dayStart,
                    lte: dayEnd,
                },
            },
            orderBy: { date: "asc" },
        });

        const conflicts = this.detectConflicts({
            timetableEntries: entries,
            exams,
        });

        return {
            date: toIsoDate(date),
            dayOfWeek,
            rotation,
            isHoliday,
            holidayName: holiday?.name ?? null,
            pauseNotifications,
            conflicts,
            entries: isHoliday && pauseNotifications ? [] : entries,
        };
    }

    async listHolidays(userId: string) {
        return prismaAny.schoolHoliday.findMany({
            where: { userId },
            orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
        });
    }

    async createHoliday(params: {
        userId: string;
        name: string;
        startDate: Date;
        endDate: Date;
        pauseNotifications?: boolean;
    }) {
        return prismaAny.schoolHoliday.create({
            data: {
                userId: params.userId,
                name: params.name,
                startDate: params.startDate,
                endDate: params.endDate,
                pauseNotifications: params.pauseNotifications ?? true,
            },
        });
    }

    async updateHoliday(params: {
        id: string;
        userId: string;
        data: {
            name?: string;
            startDate?: Date;
            endDate?: Date;
            pauseNotifications?: boolean;
        };
    }): Promise<{ count: number }> {
        return prismaAny.schoolHoliday.updateMany({
            where: { id: params.id, userId: params.userId },
            data: params.data,
        });
    }

    async deleteHoliday(params: { id: string; userId: string }): Promise<{ count: number }> {
        return prismaAny.schoolHoliday.deleteMany({
            where: { id: params.id, userId: params.userId },
        });
    }
}

export const timetableService = new TimetableService();
