/**
 * Memory Stress Test — Data Generators
 *
 * Generates large mock datasets to stress-test FlatList rendering.
 * Use with React DevTools Profiler or Flipper to detect dropped frames.
 *
 * Usage in a screen (DEV only):
 *   import { generateMockTasks, generateMockSessions } from '../tests/memoryStressTest';
 *   const data = generateMockTasks(250);  // override RTK data for stress test
 */

import { TaskStatus, PriorityEnum } from '@repo/store';

// ─── Task Generator ───────────────────────────────────────────────────────────

export function generateMockTasks(count = 200) {
    const priorities = [PriorityEnum.HIGH, PriorityEnum.MEDIUM, PriorityEnum.LOW];
    const statuses = [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED];
    const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'CS'];

    return Array.from({ length: count }, (_, i) => ({
        id: `stress-task-${i}`,
        title: `[Stress ${i + 1}] ${subjects[i % subjects.length]} — Chapter ${Math.floor(i / 7) + 1} Exercises`,
        description: i % 3 === 0 ? `Detailed notes for item ${i}. Complete before exam.` : undefined,
        status: statuses[i % statuses.length],
        priority: priorities[i % priorities.length],
        completed: i % 4 === 0,
        dueDate: new Date(Date.now() + (i - 100) * 86_400_000).toISOString(),
        effortLevel: (i % 5) + 1,
        category: i % 2 === 0 ? { name: subjects[i % subjects.length], id: `cat-${i % 7}` } : null,
        subTasks: i % 5 === 0
            ? Array.from({ length: 3 }, (__, j) => ({
                id: `subtask-${i}-${j}`,
                title: `Sub-task ${j + 1}`,
                completed: j % 2 === 0,
                taskId: `stress-task-${i}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }))
            : [],
        createdAt: new Date(Date.now() - i * 3_600_000).toISOString(),
    }));
}

// ─── Focus Session Generator ──────────────────────────────────────────────────

export function generateMockSessions(count = 100) {
    const types = ['POMODORO', 'FLOW', 'SHORT_BREAK', 'EXAM_PREP'];

    return Array.from({ length: count }, (_, i) => ({
        id: `stress-session-${i}`,
        sessionType: types[i % types.length],
        durationMinutes: 25 + (i % 6) * 5,
        xpEarned: (25 + (i % 6) * 5) * 2,
        taskTitle: `Study Session ${i + 1}`,
        subject: ['Math', 'Physics', 'CS'][i % 3],
        focusScore: 60 + (i % 40),
        startedAt: new Date(Date.now() - i * 1_800_000).toISOString(),
        endedAt: new Date(Date.now() - i * 1_800_000 + (25 + (i % 6) * 5) * 60_000).toISOString(),
        notes: i % 8 === 0 ? `Good session, covered ${3 + (i % 4)} topics.` : undefined,
    }));
}

// ─── Habit Heatmap Generator (365 days) ──────────────────────────────────────

export function generateHabitHeatmapData(days = 365) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return Array.from({ length: days }, (_, i) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const completed = Math.random() > 0.3; // ~70% completion rate
        return {
            date: d.toISOString().split('T')[0],
            completed,
            value: completed ? Math.floor(Math.random() * 3) + 1 : 0,
        };
    });
}

// ─── Analytics Chart Data Generator ──────────────────────────────────────────

export function generateAnalyticsChartData() {
    const weeks = 52;
    return {
        weeklyFocus: Array.from({ length: weeks }, (_, i) => ({
            week: i + 1,
            minutes: Math.floor(Math.random() * 300) + 60,
            sessions: Math.floor(Math.random() * 10) + 2,
        })),
        subjectBreakdown: [
            { name: 'Mathematics', minutes: 480, percentage: 30 },
            { name: 'Physics', minutes: 360, percentage: 22 },
            { name: 'Chemistry', minutes: 240, percentage: 15 },
            { name: 'Biology', minutes: 200, percentage: 12 },
            { name: 'English', minutes: 160, percentage: 10 },
            { name: 'History', minutes: 120, percentage: 8 },
            { name: 'CS', minutes: 48, percentage: 3 },
        ],
        dailyStreak: Array.from({ length: 90 }, (_, i) => ({
            date: new Date(Date.now() - (89 - i) * 86_400_000).toISOString().split('T')[0],
            active: Math.random() > 0.15,
        })),
    };
}

// ─── Performance benchmark helper ────────────────────────────────────────────

export function measureRenderTime(label: string, fn: () => void) {
    const start = performance.now();
    fn();
    const end = performance.now();
    const ms = (end - start).toFixed(2);
    console.log(`⏱️  [${label}] render: ${ms}ms ${Number(ms) > 16.7 ? '⚠️ DROPPED FRAME' : '✅'}`);
    return Number(ms);
}
