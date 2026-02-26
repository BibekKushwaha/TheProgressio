'use client';

import { useMemo, useState } from 'react';
import {
  useCreateSyllabusEdgeMutation,
  useCreateSyllabusTopicMutation,
  useDeleteSyllabusEdgeMutation,
  useDeleteSyllabusTopicMutation,
  useGetCategoriesQuery,
  useGetSyllabusEdgesQuery,
  useGetSyllabusTopicsQuery,
  useUpdateSyllabusTopicMutation,
} from '@repo/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

type Topic = {
  id: string;
  categoryId: string;
  chapter: string;
  title: string;
  notes?: string | null;
  weight?: number | null;
  estimatedHours?: number | null;
};

export default function SyllabusPage() {
  const { data: categories } = useGetCategoriesQuery();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const { data: topicsData, isLoading: topicsLoading } = useGetSyllabusTopicsQuery(
    selectedCategoryId ? { categoryId: selectedCategoryId } : undefined,
  );
  const { data: edgesData, isLoading: edgesLoading } = useGetSyllabusEdgesQuery(
    selectedCategoryId ? { categoryId: selectedCategoryId } : undefined,
  );

  const [createTopic, { isLoading: isCreatingTopic }] = useCreateSyllabusTopicMutation();
  const [updateTopic, { isLoading: isUpdatingTopic }] = useUpdateSyllabusTopicMutation();
  const [deleteTopic, { isLoading: isDeletingTopic }] = useDeleteSyllabusTopicMutation();

  const [createEdge, { isLoading: isCreatingEdge }] = useCreateSyllabusEdgeMutation();
  const [deleteEdge, { isLoading: isDeletingEdge }] = useDeleteSyllabusEdgeMutation();

  const topics = useMemo(() => (topicsData?.topics ?? []) as Topic[], [topicsData?.topics]);
  const edges = useMemo(() => (edgesData?.edges ?? []) as { id: string; fromTopicId: string; toTopicId: string; fromTopic?: Topic; toTopic?: Topic }[], [edgesData?.edges]);

  const categoryOptions = useMemo(() => categories ?? [], [categories]);

  const [newChapter, setNewChapter] = useState('Chapter 1');
  const [newTitle, setNewTitle] = useState('');

  const chapters = useMemo(() => {
    const map = new Map<string, Topic[]>();
    for (const t of topics) {
      const key = t.chapter || 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [topics]);

  const [edgeFrom, setEdgeFrom] = useState('');
  const [edgeTo, setEdgeTo] = useState('');

  const [editing, setEditing] = useState<Topic | null>(null);
  const [editChapter, setEditChapter] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const openEdit = (topic: Topic) => {
    setEditing(topic);
    setEditChapter(topic.chapter ?? 'General');
    setEditTitle(topic.title ?? '');
    setEditNotes(topic.notes ?? '');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white">Syllabus Graph</h1>
        <p className="text-slate-400 text-sm">
          Define subject topics (and prerequisites) so AI breakdowns stay curriculum-grounded.
        </p>
      </div>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Subject</CardTitle>
          <CardDescription>Select a subject/category to manage its syllabus.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-lg">
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Choose a subject…" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                {categoryOptions.map((cat: { id: string; name: string }) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!selectedCategoryId ? (
        <Card variant="glass">
          <CardContent className="py-12 text-center text-slate-500 text-sm">
            Pick a subject to start adding topics.
          </CardContent>
        </Card>
      ) : (
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
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  disabled={isCreatingTopic}
                  onClick={async () => {
                    try {
                      if (!newTitle.trim()) return toast.error('Topic title is required');
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
                  }}
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
                                onClick={() => openEdit(topic)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                className="text-red-300 hover:text-red-200 hover:bg-red-500/10"
                                disabled={isDeletingTopic}
                                onClick={async () => {
                                  try {
                                    await deleteTopic(topic.id).unwrap();
                                    toast.success('Topic deleted');
                                  } catch {
                                    toast.error('Delete failed');
                                  }
                                }}
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

          <Card variant="glass">
            <CardHeader>
              <CardTitle>Prerequisites</CardTitle>
              <CardDescription>Define topic dependencies (from → to).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Select value={edgeFrom} onValueChange={setEdgeFrom}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Topic…" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      {topics.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.chapter}: {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Select value={edgeTo} onValueChange={setEdgeTo}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Topic…" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      {topics.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.chapter}: {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    disabled={isCreatingEdge}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
                    onClick={async () => {
                      try {
                        if (!edgeFrom || !edgeTo) return toast.error('Pick both topics');
                        if (edgeFrom === edgeTo) return toast.error('From and To must differ');
                        await createEdge({ fromTopicId: edgeFrom, toTopicId: edgeTo }).unwrap();
                        setEdgeFrom('');
                        setEdgeTo('');
                        toast.success('Prerequisite added');
                      } catch (err) {
                        console.error(err);
                        toast.error('Failed to add edge');
                      }
                    }}
                  >
                    Add dependency
                  </Button>
                </div>
              </div>

              {edgesLoading ? (
                <div className="text-sm text-slate-500">Loading edges…</div>
              ) : edges.length === 0 ? (
                <div className="text-sm text-slate-500">No dependencies yet.</div>
              ) : (
                <div className="space-y-2">
                  {edges.map((edge) => (
                    <div
                      key={edge.id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03]"
                    >
                      <div className="text-sm text-white">
                        {edge.fromTopic?.chapter ?? '—'}: {edge.fromTopic?.title ?? edge.fromTopicId} →{' '}
                        {edge.toTopic?.chapter ?? '—'}: {edge.toTopic?.title ?? edge.toTopicId}
                      </div>
                      <Button
                        variant="ghost"
                        disabled={isDeletingEdge}
                        className="text-red-300 hover:text-red-200 hover:bg-red-500/10"
                        onClick={async () => {
                          try {
                            await deleteEdge(edge.id).unwrap();
                            toast.success('Dependency removed');
                          } catch {
                            toast.error('Remove failed');
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="bg-slate-950 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Edit Topic</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Chapter</Label>
              <Input
                value={editChapter}
                onChange={(e) => setEditChapter(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full min-h-[100px] rounded-md bg-white/5 border border-white/10 p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isUpdatingTopic}
                onClick={async () => {
                  try {
                    if (!editing) return;
                    if (!editTitle.trim()) return toast.error('Title is required');
                    await updateTopic({
                      id: editing.id,
                      chapter: editChapter.trim() || 'General',
                      title: editTitle.trim(),
                      notes: editNotes.trim() ? editNotes : null,
                    }).unwrap();
                    toast.success('Topic updated');
                    setEditing(null);
                  } catch (err) {
                    console.error(err);
                    toast.error('Update failed');
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

