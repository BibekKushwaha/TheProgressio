'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  useCreateSyllabusTopicMutation,
  useDeleteSyllabusTopicMutation,
  useGetSyllabusTopicsQuery,
  type SyllabusProgressChapter,
  type SyllabusProgressTopic,
  type SyllabusTopic,
} from '@repo/store';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { EditTopicDialog } from './EditTopicDialog';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { getApiErrorReportStatus } from '@/lib/api-error';
import { reportApiError } from '@/lib/errorReporter';

interface TopicSectionProps {
  selectedCategoryId: string;
  progressTopics?: SyllabusProgressTopic[];
  chapterProgress?: SyllabusProgressChapter[];
  isProgressLoading?: boolean;
}

const PROGRESS_STYLES: Record<string, string> = {
  unlinked: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  planned: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  in_progress: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
  completed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
};

const PROGRESS_LABELS: Record<string, string> = {
  unlinked: 'Unlinked',
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export function TopicSection({ selectedCategoryId, progressTopics = [], chapterProgress = [], isProgressLoading = false }: TopicSectionProps) {
  const { data: topicsData, isLoading: topicsLoading, isError: isTopicsError, error: topicsError, refetch } = useGetSyllabusTopicsQuery(
    { categoryId: selectedCategoryId },
  );
  const [createTopic, { isLoading: isCreating }] = useCreateSyllabusTopicMutation();
  const [deleteTopic] = useDeleteSyllabusTopicMutation();

  const topics = useMemo(
    () => (topicsData?.topics ?? []) as SyllabusTopic[],
    [topicsData?.topics],
  );

  const chapters = useMemo(() => {
    const map = new Map<string, SyllabusTopic[]>();
    for (const t of topics) {
      const key = t.chapter || 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [topics]);
  const progressByTopicId = useMemo(
    () => new Map(progressTopics.map((topic) => [topic.topicId, topic])),
    [progressTopics],
  );
  const progressByChapter = useMemo(
    () => new Map(chapterProgress.map((chapter) => [chapter.chapter, chapter])),
    [chapterProgress],
  );

  const [newChapter, setNewChapter] = useState('Chapter 1');
  const [newTitle, setNewTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<SyllabusTopic | null>(null);

  useEffect(() => {
    if (topicsError) {
      reportApiError(getApiErrorReportStatus(topicsError), 'getSyllabusTopics', topicsError);
    }
  }, [topicsError]);

  const handleAddTopic = useCallback(async () => {
    if (!newTitle.trim()) return toast.error('Topic title is required');
    try {
      await createTopic({
        categoryId: selectedCategoryId,
        chapter: newChapter.trim() || 'General',
        title: newTitle.trim(),
      }).unwrap();
      setNewTitle('');
      toast.success('Topic added');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add topic');
    }
  }, [createTopic, selectedCategoryId, newChapter, newTitle]);

  const handleDeleteTopic = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await deleteTopic(id).unwrap();
      toast.success('Topic deleted');
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeletingId(null);
    }
  }, [deleteTopic]);

  const buildCreateTaskHref = useCallback((topic: SyllabusTopic) => {
    const params = new URLSearchParams({
      mode: 'task',
      title: topic.title,
      topicId: topic.id,
    });
    return `/createtask?${params.toString()}`;
  }, []);

  return (
    <>
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Topics</CardTitle>
          <CardDescription>Add chapters/topics. Keep titles short and consistent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Chapter</Label>
              <Input
                value={newChapter}
                onChange={(e) => setNewChapter(e.target.value)}
                className="bg-white/5 border-white/10"
                placeholder="Chapter 1"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Topic title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-white/5 border-white/10"
                placeholder="e.g. Quadratic Equations"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddTopic(); }}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              disabled={isCreating}
              onClick={handleAddTopic}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Add topic
            </Button>
          </div>

          <div className="space-y-4">
            {topicsLoading ? (
              <div className="text-sm text-slate-500">Loading topics…</div>
            ) : isTopicsError && topics.length === 0 ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
                    <p>Topics are temporarily unavailable for this subject.</p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
                    onClick={() => void refetch()}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Retry topics
                  </Button>
                </div>
              </div>
            ) : topics.length === 0 ? (
              <div className="text-sm text-slate-500">No topics yet.</div>
            ) : (
              chapters.map(([chapter, list]) => (
                <div key={chapter} className="rounded-xl border border-white/10 bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
                    <div className="text-sm font-semibold text-white">{chapter}</div>
                    {progressByChapter.has(chapter) ? (
                      <div className="text-xs text-slate-400">
                        {progressByChapter.get(chapter)?.linkedTopics}/{progressByChapter.get(chapter)?.totalTopics} linked
                        {' • '}
                        {progressByChapter.get(chapter)?.coveragePercent}% coverage
                      </div>
                    ) : isProgressLoading ? (
                      <div className="text-xs text-slate-500">Loading progress…</div>
                    ) : null}
                  </div>
                  <div className="divide-y divide-white/10">
                    {list.map((topic) => (
                      <div key={topic.id} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm text-white">{topic.title}</div>
                            {progressByTopicId.has(topic.id) ? (
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${PROGRESS_STYLES[progressByTopicId.get(topic.id)?.progressState ?? 'unlinked']}`}
                              >
                                {PROGRESS_LABELS[progressByTopicId.get(topic.id)?.progressState ?? 'unlinked']}
                              </span>
                            ) : null}
                          </div>
                          {progressByTopicId.has(topic.id) ? (
                            <div className="mt-1 text-xs text-slate-400">
                              {progressByTopicId.get(topic.id)?.linkedTaskCount ?? 0} linked task
                              {(progressByTopicId.get(topic.id)?.linkedTaskCount ?? 0) === 1 ? '' : 's'}
                              {' • '}
                              {progressByTopicId.get(topic.id)?.completedTaskCount ?? 0} completed
                            </div>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={buildCreateTaskHref(topic)}
                            className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition-colors hover:bg-white/10"
                          >
                            Create task
                          </Link>
                          <Button
                            variant="outline"
                            className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
                            onClick={() => setEditing(topic)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            className="text-red-300 hover:text-red-200 hover:bg-red-500/10"
                            disabled={deletingId === topic.id}
                            onClick={() => handleDeleteTopic(topic.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <EditTopicDialog editing={editing} onClose={() => setEditing(null)} />
    </>
  );
}
