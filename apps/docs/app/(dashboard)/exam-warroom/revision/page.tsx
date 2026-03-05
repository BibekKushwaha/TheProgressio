'use client';

import { useMemo } from 'react';
import { FileSpreadsheet, CalendarDays, ExternalLink, CheckCircle } from 'lucide-react';
import { RevisionScheduler } from '@/components/analytics/RevisionScheduler';
import { SubjectPerformanceSummary } from '@/components/analytics/SubjectPerformanceSummary';
import { useGetNudgesQuery, useMarkNudgeAsReadMutation, type Nudge } from '@repo/store';
import { navigateDeepLink, parseNudgeMetadata, resolveNudgeDeepLink, formatScheduledAt } from '@/components/notifications/notificationUtils';
import { useRouter } from 'next/navigation';

export default function ExamWarRoomPage() {
    const router = useRouter();
    const { data, isLoading } = useGetNudgesQuery(undefined, {
        refetchOnMountOrArgChange: false,
        refetchOnFocus: false,
    });
    const [markRead, { isLoading: isMarkingRead }] = useMarkNudgeAsReadMutation();

    const revisionGroups = useMemo(() => {
        const nudges: Nudge[] = data?.nudges ?? [];
        const drip = nudges.filter((n) => parseNudgeMetadata(n.metadata).dripCampaign === true);
        const now = Date.now();

        type Group = { examTitle: string; deepLink: string; items: Nudge[]; nextAt: number | null };
        const byExam = new Map<string, Group>();

        for (const nudge of drip) {
            const meta = parseNudgeMetadata(nudge.metadata);
            const deepLink = resolveNudgeDeepLink(meta);

            let examTitle = 'Revision Campaign';
            try {
                const url = new URL(deepLink, window.location.origin);
                const q = url.searchParams.get('exam');
                if (q && q.trim()) examTitle = q;
            } catch {
                // ignore parse failures; keep fallback label
            }

            const group = byExam.get(examTitle) ?? { examTitle, deepLink, items: [], nextAt: null };
            const scheduledAtMs = new Date(nudge.scheduledAt).getTime();
            if (!Number.isFinite(scheduledAtMs)) continue;
            if (scheduledAtMs < now) continue; // hide past campaign items
            group.items.push(nudge);
            byExam.set(examTitle, group);
        }

        const groups = Array.from(byExam.values()).map((g) => {
            const times = g.items
                .map((n) => new Date(n.scheduledAt).getTime())
                .filter((t) => Number.isFinite(t));
            const future = times.filter((t) => t >= now).sort((a, b) => a - b);
            const nextAt = future[0] ?? (times.sort((a, b) => a - b)[0] ?? null);

            // Prefer the deep link of the next upcoming item (or the first item as fallback).
            const datedItems = g.items
                .map((n) => ({ n, t: new Date(n.scheduledAt).getTime() }))
                .filter((x) => Number.isFinite(x.t))
                .sort((a, b) => a.t - b.t);
            const nextItem =
                datedItems.find((x) => x.t >= now)?.n ??
                datedItems[0]?.n;
            const nextDeepLink = nextItem ? resolveNudgeDeepLink(parseNudgeMetadata(nextItem.metadata)) : g.deepLink;

            return {
                ...g,
                deepLink: nextDeepLink || g.deepLink,
                items: g.items.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
                nextAt,
            };
        }).filter((g) => g.items.length > 0);

        return groups.sort((a, b) => {
            const at = a.nextAt ?? Number.POSITIVE_INFINITY;
            const bt = b.nextAt ?? Number.POSITIVE_INFINITY;
            return at - bt;
        });
    }, [data]);

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                        <CalendarDays className="w-4 h-4 text-purple-300" />
                        Upcoming revision campaigns
                    </div>
                    <div className="text-xs text-slate-500">
                        Created via Tasks → Schedule Revision
                    </div>
                </div>

                {isLoading ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">
                        Loading campaigns...
                    </div>
                ) : revisionGroups.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">
                        No revision campaigns scheduled yet. Pick a task and use “Schedule Revision”.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {revisionGroups.map((group) => (
                            <div key={group.examTitle} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div className="min-w-0">
                                        <div className="text-white font-bold truncate">{group.examTitle}</div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            Revision Campaign ({group.items.length} reminders) • next {group.nextAt ? new Date(group.nextAt).toLocaleString() : 'unknown'}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => navigateDeepLink(group.deepLink, router.push)}
                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 transition-colors text-xs font-semibold"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Open
                                    </button>
                                </div>

                                <div className="mt-3 space-y-2">
                                    {group.items.slice(0, 3).map((nudge) => (
                                        <div key={nudge.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-white truncate">{nudge.title}</div>
                                                <div className="text-xs text-slate-400 mt-1 line-clamp-2">{nudge.message}</div>
                                                <div className="text-xs text-slate-500 mt-2">
                                                    {formatScheduledAt(nudge.scheduledAt)}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const meta = parseNudgeMetadata(nudge.metadata);
                                                        navigateDeepLink(resolveNudgeDeepLink(meta), router.push);
                                                    }}
                                                    className="px-2.5 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200"
                                                >
                                                    Open
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isMarkingRead || nudge.isRead}
                                                    onClick={() => markRead(nudge.id)}
                                                    className="px-2.5 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                                        {nudge.isRead ? 'Read' : 'Mark'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {group.items.length > 3 && (
                                        <div className="text-xs text-slate-500">
                                            +{group.items.length - 3} more scheduled
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-4">
                    <FileSpreadsheet className="w-4 h-4 text-cyan-300" />
                    Revision Planner
                </div>
                <RevisionScheduler />
            </div>
            {/* Subject Performance Summary */}
            {/* Subject Performance Summary */}
            <SubjectPerformanceSummary />

        </div>
    );
}
