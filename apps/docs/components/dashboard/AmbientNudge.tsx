"use client";

import { useMemo } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useGetTasksQuery, useGetMorningBriefingQuery, TaskStatus, Task } from '@repo/store';
import Link from 'next/link';

export function AmbientNudge() {
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);
    const { data: tasks } = useGetTasksQuery({ date: today });
    const { data: briefingInfo } = useGetMorningBriefingQuery();

    const nudge = useMemo(() => {
        if (!tasks || !briefingInfo?.briefing) return null;

        const openTasks = tasks.filter((t: Task) => t.status !== TaskStatus.COMPLETED);
        const completedTasks = tasks.filter((t: Task) => t.status === TaskStatus.COMPLETED);
        const upcomingExams = briefingInfo.briefing.upcomingExams;
        const streaksAtRisk = briefingInfo.briefing.streaksAtRisk ?? [];
        const hour = new Date().getHours();

        // Spaced repetition: if completed tasks exist, suggest revisiting older topics
        if (completedTasks.length > 0 && openTasks.length < 3) {
            const subjectsStudied = new Set(
                completedTasks
                    .map((t: Task) => t.category?.name)
                    .filter((n): n is string => Boolean(n))
            );
            if (subjectsStudied.size > 0) {
                const subjectName = [...subjectsStudied][0];
                return {
                    text: `You've been making progress! Review "${subjectName}" soon — spaced repetition boosts retention by 40%.`,
                    action: "Syllabus Graph",
                    href: "/syllabus"
                };
            }
        }

        // Streak at risk warning
        if (streaksAtRisk.length > 0) {
            return {
                text: `Your "${streaksAtRisk[0]?.name}" streak is at risk! Complete it today to keep your streak alive.`,
                action: "Habits",
                href: "/habits"
            };
        }

        if (upcomingExams.length > 0 && openTasks.length === 0) {
            return {
                text: "You have upcoming exams but no tasks scheduled today. Want to break down an exam?",
                action: "Exam War Room",
                href: "/exam-warroom"
            };
        }

        if (openTasks.length > 5) {
            return {
                text: "You have a lot on your plate today. Want to prioritize your list?",
                action: "Review Tasks",
                href: "/tasks"
            };
        }

        // Time-of-day focus suggestion
        if (hour >= 14 && hour <= 17 && openTasks.length > 0) {
            return {
                text: "Afternoon slump? A 25-minute focused sprint can help you push through.",
                action: "Start Focus",
                href: "/focus-session"
            };
        }

        if (upcomingExams.length === 0 && openTasks.length === 0) {
            return {
                text: "Looks like a clear day! Perfect time to explore new subjects.",
                action: "Knowledge Graph",
                href: "/syllabus"
            };
        }

        return null;
    }, [tasks, briefingInfo]);

    if (!nudge) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="mb-6 flex items-center justify-between gap-4 p-3 px-4 bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-500/20 rounded-xl relative overflow-hidden group"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 blur-xl group-hover:opacity-100 opacity-0 transition-opacity" />

            <div className="flex items-center gap-3 relative z-10 w-full flex-wrap sm:flex-nowrap">
                <div className="shrink-0 p-1.5 bg-purple-500/20 rounded-lg text-purple-400">
                    <Sparkles className="w-4 h-4" />
                </div>
                <p className="text-sm text-slate-300 font-medium">
                    <span className="text-purple-300 font-semibold mr-1">AI Insight:</span>
                    {nudge.text}
                </p>
                <Link
                    href={nudge.href}
                    className="sm:ml-auto shrink-0 flex items-center gap-1.5 text-xs font-bold text-white bg-purple-500 hover:bg-purple-600 px-3 py-1.5 rounded-lg transition-colors"
                >
                    {nudge.action}
                    <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
        </div>
    );
}
