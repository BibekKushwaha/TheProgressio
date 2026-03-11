'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useGetSyllabusTopicsQuery } from '@repo/store';

type SyllabusTopicSelectorProps = {
  categoryId: string;
  selectedTopicIds: string[];
  onChange: (topicIds: string[]) => void;
};

export function SyllabusTopicSelector({ categoryId, selectedTopicIds, onChange }: SyllabusTopicSelectorProps) {
  const { data, isLoading } = useGetSyllabusTopicsQuery(
    categoryId ? { categoryId } : undefined,
    { skip: !categoryId },
  );

  const topics = useMemo(() => data?.topics ?? [], [data?.topics]);

  const visibleTopics = useMemo(() => {
    const selectedSet = new Set(selectedTopicIds);
    const selectedTopics = topics.filter((topic) => selectedSet.has(topic.id));
    const firstTopics = topics.slice(0, 8);
    const merged = [...selectedTopics, ...firstTopics];
    const seen = new Set<string>();
    return merged.filter((topic) => {
      if (seen.has(topic.id)) return false;
      seen.add(topic.id);
      return true;
    });
  }, [selectedTopicIds, topics]);
  const allowedIds = useMemo(() => new Set(topics.map((topic) => topic.id)), [topics]);

  useEffect(() => {
    const nextIds = selectedTopicIds.filter((id) => allowedIds.has(id));
    if (nextIds.length !== selectedTopicIds.length) {
      onChange(nextIds);
    }
  }, [allowedIds, onChange, selectedTopicIds]);

  if (!categoryId) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Syllabus Topics</p>
          <p className="mt-1 text-xs text-slate-400">
            Link this task to the syllabus so topic coverage and progress stay current.
          </p>
        </div>
        <Link href="/createtask?mode=syllabus" className="text-xs text-indigo-300 hover:text-indigo-200">
          Import topics
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading syllabus topics…</p>
      ) : topics.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/30 px-3 py-3 text-sm text-slate-500">
          No syllabus topics exist for this subject yet.
        </div>
      ) : (
        <div className="space-y-2">
          {selectedTopicIds.length > 0 ? (
            <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-100">
              {selectedTopicIds.length} topic{selectedTopicIds.length === 1 ? '' : 's'} will be linked on save.
            </div>
          ) : null}
          {visibleTopics.map((topic) => {
            const checked = selectedTopicIds.includes(topic.id);
            return (
              <label
                key={topic.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/30 px-3 py-2.5 text-sm text-slate-100"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (checked) {
                      onChange(selectedTopicIds.filter((id) => id !== topic.id));
                    } else {
                      onChange([...selectedTopicIds, topic.id]);
                    }
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="mr-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">{topic.chapter}</span>
                  <span>{topic.title}</span>
                </span>
              </label>
            );
          })}

          <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
            <span>{selectedTopicIds.length} topic{selectedTopicIds.length === 1 ? '' : 's'} linked</span>
            {topics.length > visibleTopics.length ? (
              <Link href="/syllabus" className="text-indigo-300 hover:text-indigo-200">
                View all {topics.length} topics
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
