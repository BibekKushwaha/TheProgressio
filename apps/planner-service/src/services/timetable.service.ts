
import { prisma } from "@repo/db";


export class TimetableService {

    /**
     * Determines the current rotation (e.g., Week A or Week B) based on a reference date.
     * Assumes a 2-week cycle starting from a reference date (e.g., first Monday of the year).
     */
    getRotationForDate(date: Date): "A" | "B" {
        // Simplified logic: Even weeks are A, Odd weeks are B relative to year start
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
        const rotation = this.getRotationForDate(date);

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
