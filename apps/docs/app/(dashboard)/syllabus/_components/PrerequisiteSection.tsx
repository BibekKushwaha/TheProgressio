'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  useCreateSyllabusEdgeMutation,
  useDeleteSyllabusEdgeMutation,
  useGetSyllabusEdgesQuery,
  useGetSyllabusTopicsQuery,
  type SyllabusTopic,
  type SyllabusEdge,
} from '@repo/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { getApiErrorReportStatus } from '@/lib/api-error';
import { reportApiError } from '@/lib/errorReporter';

interface PrerequisiteSectionProps {
  selectedCategoryId: string;
}

export function PrerequisiteSection({ selectedCategoryId }: PrerequisiteSectionProps) {
  // RTK Query deduplicates this call — TopicSection uses the same key, no double fetch.
  const { data: topicsData, isError: isTopicsError, error: topicsError } = useGetSyllabusTopicsQuery({ categoryId: selectedCategoryId });
  const { data: edgesData, isLoading: edgesLoading, isError: isEdgesError, error: edgesError, refetch } = useGetSyllabusEdgesQuery(
    { categoryId: selectedCategoryId },
  );
  const [createEdge, { isLoading: isCreatingEdge }] = useCreateSyllabusEdgeMutation();
  const [deleteEdge] = useDeleteSyllabusEdgeMutation();

  const topics = useMemo(
    () => (topicsData?.topics ?? []) as SyllabusTopic[],
    [topicsData?.topics],
  );
  const edges = useMemo(
    () => (edgesData?.edges ?? []) as SyllabusEdge[],
    [edgesData?.edges],
  );

  const [edgeFrom, setEdgeFrom] = useState('');
  const [edgeTo, setEdgeTo] = useState('');
  const [deletingEdgeId, setDeletingEdgeId] = useState<string | null>(null);

  useEffect(() => {
    if (topicsError) {
      reportApiError(getApiErrorReportStatus(topicsError), 'getSyllabusTopics', topicsError);
    }
  }, [topicsError]);

  useEffect(() => {
    if (edgesError) {
      reportApiError(getApiErrorReportStatus(edgesError), 'getSyllabusEdges', edgesError);
    }
  }, [edgesError]);

  const handleAddEdge = useCallback(async () => {
    if (!edgeFrom || !edgeTo) return toast.error('Pick both topics');
    if (edgeFrom === edgeTo) return toast.error('From and To must differ');
    try {
      await createEdge({ fromTopicId: edgeFrom, toTopicId: edgeTo }).unwrap();
      setEdgeFrom('');
      setEdgeTo('');
      toast.success('Prerequisite added');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add edge');
    }
  }, [createEdge, edgeFrom, edgeTo]);

  const handleDeleteEdge = useCallback(async (id: string) => {
    setDeletingEdgeId(id);
    try {
      await deleteEdge(id).unwrap();
      toast.success('Dependency removed');
    } catch {
      toast.error('Remove failed');
    } finally {
      setDeletingEdgeId(null);
    }
  }, [deleteEdge]);

  return (
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
              onClick={handleAddEdge}
            >
              Add dependency
            </Button>
          </div>
        </div>

        {edgesLoading ? (
          <div className="text-sm text-slate-500">Loading edges…</div>
        ) : isEdgesError && edges.length === 0 ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
                <p>Prerequisite dependencies are temporarily unavailable for this subject.</p>
              </div>
              <Button
                variant="outline"
                className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
                onClick={() => void refetch()}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Retry dependencies
              </Button>
            </div>
          </div>
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
                  disabled={deletingEdgeId === edge.id}
                  className="text-red-300 hover:text-red-200 hover:bg-red-500/10"
                  onClick={() => handleDeleteEdge(edge.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        {isTopicsError && topics.length === 0 ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
              <p>Topic options are temporarily unavailable, so new dependencies cannot be added right now.</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
