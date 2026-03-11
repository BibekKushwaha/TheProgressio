'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BookOpenCheck, Clock3, RefreshCcw, Sparkles } from 'lucide-react';
import { useGetCategoriesQuery, useGetSyllabusRevisionRecommendationsQuery, type RevisionRecommendation } from '@repo/store';

const SUMMARY_CARDS = [
  { key: 'coverageGapCount', label: 'Coverage Gaps', helper: 'topics with no linked tasks', icon: AlertTriangle },
  { key: 'needsStudyCount', label: 'Needs Study', helper: 'linked topics not completed yet', icon: Clock3 },
  { key: 'readyToReviseCount', label: 'Ready to Revise', helper: 'topics with completed study tasks', icon: Sparkles },
  { key: 'completedTopics', label: 'Completed Topics', helper: 'already completed in this subject', icon: BookOpenCheck },
] as const;

const BUCKET_CONFIG = [
  {
    key: 'coverageGap',
    title: 'Coverage Gaps',
    empty: 'Every topic in this subject already has at least one linked task.',
  },
  {
    key: 'needsStudy',
    title: 'Needs Study',
    empty: 'No partially planned or in-progress topics need attention right now.',
  },
  {
    key: 'readyToRevise',
    title: 'Ready to Revise',
    empty: 'No completed topics are ready for a revision pass yet.',
  },
] as const;

export function SyllabusRevisionPlanner() {
  const { data: categories = [], isLoading: isLoadingCategories } = useGetCategoriesQuery();
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useGetSyllabusRevisionRecommendationsQuery(
    { categoryId: selectedCategoryId },
    { skip: !selectedCategoryId },
  );

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId),
    [categories, selectedCategoryId],
  );

  const hasCategories = categories.length > 0;

  const buildCreateTaskHref = (title: string, topicId: string, recommendationType: string) => {
    const params = new URLSearchParams({
      mode: 'task',
      title: recommendationType === 'ready_to_revise' ? `Revise ${title}` : title,
      topicId,
    });
    return `/createtask?${params.toString()}`;
  };

  const getPrimaryAction = (item: RevisionRecommendation) => {
    if (item.suggestedAction === 'revise_topic') {
      return {
        href: buildCreateTaskHref(item.title, item.topicId, item.recommendationType),
        label: 'Create revision task',
      };
    }

    if (item.suggestedAction === 'view_syllabus') {
      return {
        href: '/syllabus',
        label: 'View syllabus',
      };
    }

    return {
      href: buildCreateTaskHref(item.title, item.topicId, item.recommendationType),
      label: 'Create task',
    };
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-300">Syllabus Revision Recommendations</div>
          <p className="mt-1 text-sm text-slate-500">
            Pick one subject to see coverage gaps, active study topics, and revision-ready topics from your syllabus graph.
          </p>
        </div>
        <div className="w-full md:w-72">
          <label htmlFor="syllabus-revision-category" className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Subject
          </label>
          <select
            id="syllabus-revision-category"
            value={selectedCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-indigo-400/60"
          >
            <option value="" className="bg-slate-950">
              {isLoadingCategories ? 'Loading subjects…' : 'Choose a syllabus subject…'}
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id} className="bg-slate-950">
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!isLoadingCategories && !hasCategories ? (
        <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-slate-950/30 px-4 py-6 text-sm text-slate-400">
          <div>Import a syllabus or create a subject to unlock syllabus-linked revision planning.</div>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/createtask?mode=syllabus"
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-100 transition-colors hover:bg-indigo-500/20"
            >
              Import syllabus
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/syllabus" className="text-xs font-medium text-slate-300 transition-colors hover:text-white">
              Open syllabus
            </Link>
          </div>
        </div>
      ) : !selectedCategoryId ? (
        <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-slate-950/30 px-4 py-6 text-sm text-slate-400">
          Select a subject to generate syllabus-linked revision recommendations.
        </div>
      ) : isLoading ? (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            {SUMMARY_CARDS.map((card) => (
              <div key={card.key} className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
            ))}
          </div>
          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-28 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p>
              We couldn&apos;t load syllabus revision recommendations for {selectedCategory?.name ?? 'this subject'}.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        </div>
      ) : data ? (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            {SUMMARY_CARDS.map((card) => {
              const Icon = card.icon;
              const value = data.summary[card.key];
              return (
                <div key={card.key} className="rounded-xl border border-white/10 bg-slate-950/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{card.label}</div>
                      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{card.helper}</div>
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            {BUCKET_CONFIG.map((bucket) => {
              const items = data.buckets[bucket.key];
              return (
                <div key={bucket.key} className="rounded-xl border border-white/10 bg-slate-950/30 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{bucket.title}</div>
                      <div className="text-xs text-slate-500">{items.length} topic{items.length === 1 ? '' : 's'}</div>
                    </div>
                  </div>

                  {items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-sm text-slate-500">
                      {bucket.empty}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item: RevisionRecommendation) => {
                        const primaryAction = getPrimaryAction(item);

                        return (
                          <div key={item.topicId} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{item.chapter}</span>
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                                    {item.progressState.replace('_', ' ')}
                                  </span>
                                </div>
                                <div className="mt-2 text-base font-semibold text-white">{item.title}</div>
                                <div className="mt-2 text-sm text-slate-400">{item.reason}</div>
                                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                                  <span>{item.linkedTaskCount} linked task{item.linkedTaskCount === 1 ? '' : 's'}</span>
                                  <span>{item.completedTaskCount} completed</span>
                                </div>
                              </div>

                              <div className="flex flex-col gap-2 lg:items-end">
                                <Link
                                  href={primaryAction.href}
                                  className="inline-flex items-center gap-2 rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-100 transition-colors hover:bg-indigo-500/20"
                                >
                                  {primaryAction.label}
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                                {item.suggestedAction === 'view_syllabus' ? (
                                  <div className="text-xs text-slate-500">This topic already has active study work.</div>
                                ) : (
                                  <Link
                                    href="/syllabus"
                                    className="text-xs text-slate-400 transition-colors hover:text-slate-200"
                                  >
                                    View syllabus
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
