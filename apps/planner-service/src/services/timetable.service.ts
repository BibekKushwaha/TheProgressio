
import { prisma } from "@repo/db";


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
    async getDailySchedule(userId: string, date: Date) {
        const dayOfWeek = date.getDay(); // 0 is Sunday
        const rotation = await this.getRotationForDate(userId, date);

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

        return {
            date: date.toISOString().split('T')[0],
            dayOfWeek,
            rotation,
            entries
        };
    }
}

export const timetableService = new TimetableService();
