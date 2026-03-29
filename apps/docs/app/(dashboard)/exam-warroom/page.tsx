'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { PredictiveScoreCard } from '@/components/analytics/PredictiveScoreCard';
import { SWOTAnalysis } from '@/components/analytics/SWOTAnalysis';
import { SubjectPerformanceSummary } from '@/components/analytics/SubjectPerformanceSummary';
import { GradeEntryManager } from '@/components/analytics/GradeEntryManager';
import { RevisionScheduler } from '@/components/analytics/RevisionScheduler';
import { SyllabusRevisionPlanner } from '@/components/analytics/SyllabusRevisionPlanner';
import { resolveExamType } from '@/components/analytics/examWarRoomUtils';
import {
  useGetAllSubjectPerformanceQuery,
  useGetGradeEntriesQuery,
  useGetNudgesQuery,
  useMarkNudgeAsReadMutation,
  type Nudge,
} from '@repo/store';
import {
  navigateDeepLink,
  parseNudgeMetadata,
  resolveNudgeDeepLink,
  formatScheduledAt,
} from '@/components/notifications/notificationUtils';
import {
  BookOpen,
  CalendarDays,
  CheckCircle,
  ExternalLink,
  FileSpreadsheet,
  GraduationCap,
  Swords,
  Target,
  Trophy,
} from 'lucide-react';

export default function ExamWarRoomPage() {
  const router = useRouter();
  const { data: performanceData, isLoading: isPerformanceLoading } = useGetAllSubjectPerformanceQuery();
  const { data: gradeEntriesData } = useGetGradeEntriesQuery();
  const { data: nudgeData, isLoading: isNudgesLoading } = useGetNudgesQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
  });
  const [markRead, { isLoading: isMarkingRead }] = useMarkNudgeAsReadMutation();

  const subjects = useMemo(() => performanceData?.data ?? [], [performanceData]);
  const inferredExamType = useMemo(
    () => resolveExamType(undefined, gradeEntriesData?.entries),
    [gradeEntriesData?.entries],
  );
  const [selectedExamType, setSelectedExamType] = useState(inferredExamType);

  useEffect(() => {
    if (!selectedExamType.trim()) {
      setSelectedExamType(inferredExamType);
    }
  }, [inferredExamType, selectedExamType]);

  const activeExamType = selectedExamType.trim() || inferredExamType;

  const tierStats = useMemo(() => {
    const stats = { strong: 0, developing: 0, needsWork: 0, totalAttempts: 0 };
    for (const subject of subjects) {
      const score = subject.avgScore ?? 0;
      stats.totalAttempts += subject.entryCount ?? 0;
      if (score >= 80) stats.strong++;
      else if (score >= 50) stats.developing++;
      else stats.needsWork++;
    }
    return stats;
  }, [subjects]);

  const revisionGroups = useMemo(() => {
    const nudges: Nudge[] = nudgeData?.nudges ?? [];
    const drip = nudges.filter((n) => parseNudgeMetadata(n.metadata).dripCampaign === true);
    const now = Date.now();

    type Group = { examTitle: string; deepLink: string; items: Nudge[]; nextAt: number | null };
    const byExam = new Map<string, Group>();

    const readMetaString = (meta: Record<string, unknown>, keys: string[]) => {
      for (const key of keys) {
        const value = meta[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
      }
      return '';
    };

    const getFallbackTitleFromNudge = (nudge: Nudge) => {
      const raw = nudge.title?.trim() || nudge.message?.trim() || '';
      return raw.replace(/^revise\s+/i, '').replace(/^revision\s*[:-]\s*/i, '').trim() || 'Revision Campaign';
    };

    for (const nudge of drip) {
      const meta = parseNudgeMetadata(nudge.metadata);
      const deepLink = resolveNudgeDeepLink(meta);
      const metadataTitle = readMetaString(meta, ['examTitle', 'exam', 'campaignTitle', 'title']);
      let examTitle = metadataTitle;
      let groupingPath = deepLink.split('?')[0] || deepLink;

      try {
        const url = new URL(deepLink, window.location.origin);
        const q = url.searchParams.get('exam');
        if (!examTitle && q && q.trim()) examTitle = q.trim();
        groupingPath = url.pathname || groupingPath;
      } catch {
        // Keep fallback path for grouping.
      }

      examTitle = examTitle || getFallbackTitleFromNudge(nudge);
      const groupKey = `${examTitle}::${groupingPath}`;
      const group = byExam.get(groupKey) ?? { examTitle, deepLink, items: [], nextAt: null };
      const scheduledAtMs = new Date(nudge.scheduledAt).getTime();
      if (!Number.isFinite(scheduledAtMs) || scheduledAtMs < now) continue;
      group.items.push(nudge);
      byExam.set(groupKey, group);
    }

    return Array.from(byExam.values())
      .map((group) => {
        const datedItems = group.items
          .map((n) => ({ n, t: new Date(n.scheduledAt).getTime() }))
          .filter((item) => Number.isFinite(item.t))
          .sort((a, b) => a.t - b.t);

        const nextItem = datedItems.find((item) => item.t >= now)?.n ?? datedItems[0]?.n;
        const nextAt = datedItems.find((item) => item.t >= now)?.t ?? datedItems[0]?.t ?? null;

        return {
          ...group,
          deepLink: nextItem ? resolveNudgeDeepLink(parseNudgeMetadata(nextItem.metadata)) : group.deepLink,
          items: group.items.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
          nextAt,
        };
      })
      .filter((group) => group.items.length > 0)
      .sort((a, b) => (a.nextAt ?? Number.POSITIVE_INFINITY) - (b.nextAt ?? Number.POSITIVE_INFINITY));
  }, [nudgeData]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Exam War Room"
        subtitle="Overview, academic tracking, and revision operations in one command center."
      />

      <div className="flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <a href="#overview" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10">Overview</a>
        <a href="#academic" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10">Academic</a>
        <a href="#revision" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10">Revision</a>
      </div>

      <section id="overview" className="space-y-6 scroll-mt-24">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          <Swords className="h-4 w-4 text-rose-300" />
          Overview
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5">
            <div className="text-sm text-slate-400 mb-1">Total Attempts</div>
            <div className="text-3xl font-bold text-white">
              {isPerformanceLoading ? <div className="h-9 w-16 bg-white/10 rounded animate-pulse" /> : tierStats.totalAttempts}
            </div>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 text-sm text-green-400 mb-1">
              <Trophy className="w-4 h-4" /> Strong (≥80%)
            </div>
            <div className="text-3xl font-bold text-green-400">
              {isPerformanceLoading ? <div className="h-9 w-16 bg-green-500/20 rounded animate-pulse" /> : tierStats.strong}
            </div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 text-sm text-yellow-400 mb-1">
              <Target className="w-4 h-4" /> Developing (50–79%)
            </div>
            <div className="text-3xl font-bold text-yellow-400">
              {isPerformanceLoading ? <div className="h-9 w-16 bg-yellow-500/20 rounded animate-pulse" /> : tierStats.developing}
            </div>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 text-sm text-red-400 mb-1">
              <Swords className="w-4 h-4" /> Needs Work (&lt;50%)
            </div>
            <div className="text-3xl font-bold text-red-400">
              {isPerformanceLoading ? <div className="h-9 w-16 bg-red-500/20 rounded animate-pulse" /> : tierStats.needsWork}
            </div>
          </div>
        </div>

        <PredictiveScoreCard examType={activeExamType} />
        <SWOTAnalysis examType={activeExamType} allowExamTypeChange={false} />
        <SubjectPerformanceSummary subjects={subjects} />
      </section>

      <section id="academic" className="space-y-6 scroll-mt-24">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          <GraduationCap className="h-4 w-4 text-indigo-300" />
          Academic
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
            <GraduationCap className="w-4 h-4 text-indigo-300" />
            Academic exam context
          </div>
          <div className="flex flex-col gap-2 sm:max-w-xs">
            <label htmlFor="academic-exam-type" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Exam type
            </label>
            <input
              id="academic-exam-type"
              value={selectedExamType}
              onChange={(event) => setSelectedExamType(event.target.value)}
              placeholder="Exam type"
              className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-indigo-400/60"
            />
            <p className="text-xs text-slate-500">
              Grade entries and predictive scores stay aligned to this exam type.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <GradeEntryManager examType={activeExamType} allowExamTypeEdit={false} />
          <PredictiveScoreCard examType={activeExamType} />
        </div>
      </section>

      <section id="revision" className="space-y-6 scroll-mt-24">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          <BookOpen className="h-4 w-4 text-cyan-300" />
          Revision
        </div>

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

          {isNudgesLoading ? (
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
                <div key={`${group.examTitle}-${group.deepLink}`} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
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
            Generated Exam Strategy Schedule
          </div>
          <p className="mb-4 text-sm text-slate-500">
            Review the latest suggested revision blocks generated from your current weak areas and exam routine.
          </p>
          <RevisionScheduler />
        </div>

        <SyllabusRevisionPlanner />
      </section>
    </div>
  );
}
