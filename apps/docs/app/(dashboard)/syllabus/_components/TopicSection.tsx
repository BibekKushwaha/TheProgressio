'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  useCreateSyllabusTopicMutation,
  useDeleteSyllabusTopicMutation,
  useGetSyllabusTopicsQuery,
  type SyllabusTopic,
} from '@repo/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { EditTopicDialog } from './EditTopicDialog';

interface TopicSectionProps {
  selectedCategoryId: string;
}

export function TopicSection({ selectedCategoryId }: TopicSectionProps) {
  const { data: topicsData, isLoading: topicsLoading } = useGetSyllabusTopicsQuery(
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

  const [newChapter, setNewChapter] = useState('Chapter 1');
  const [newTitle, setNewTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<SyllabusTopic | null>(null);

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
            ) : topics.length === 0 ? (
              <div className="text-sm text-slate-500">No topics yet.</div>
            ) : (
              chapters.map(([chapter, list]) => (
                <div key={chapter} className="rounded-xl border border-white/10 bg-white/[0.03]">
                  <div className="px-4 py-3 border-b border-white/10 text-sm font-semibold text-white">
                    {chapter}
                  </div>
                  <div className="divide-y divide-white/10">
                    {list.map((topic) => (
                      <div key={topic.id} className="flex items-center justify-between px-4 py-3">
                        <div className="text-sm text-white">{topic.title}</div>
                        <div className="flex items-center gap-2">
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
