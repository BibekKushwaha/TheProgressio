'use client';

import { useEffect, useState } from 'react';
import { useGetCategoriesQuery, useGetSyllabusProgressQuery } from '@repo/store';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TopicSection } from './_components/TopicSection';
import { PrerequisiteSection } from './_components/PrerequisiteSection';
import { SyllabusProgressSection } from './_components/SyllabusProgressSection';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { getApiErrorReportStatus } from '@/lib/api-error';
import { reportApiError } from '@/lib/errorReporter';

export default function SyllabusPage() {
  const { data: categories, isLoading, isError, error, refetch } = useGetCategoriesQuery();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const {
    data: progressData,
    isLoading: isProgressLoading,
    isError: isProgressError,
    refetch: refetchProgress,
  } = useGetSyllabusProgressQuery(
    { categoryId: selectedCategoryId },
    { skip: !selectedCategoryId },
  );

  useEffect(() => {
    if (error) {
      reportApiError(getApiErrorReportStatus(error), 'getCategories', error);
    }
  }, [error]);

  if (isError && !(categories ?? []).length && !isLoading) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-white backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-red-400/30 bg-red-500/20 p-2">
            <AlertTriangle className="h-5 w-5 text-red-200" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">Syllabus graph is temporarily unavailable</h2>
            <p className="mt-2 text-sm text-slate-200">
              We could not load subject categories for syllabus management right now.
            </p>
            <button
              onClick={() => void refetch()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry syllabus
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isError ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
              <p>Category sync is temporarily unavailable. Syllabus editing may be limited until the next refresh.</p>
            </div>
            <button
              onClick={() => void refetch()}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Retry data
            </button>
          </div>
        </div>
      ) : null}
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
                {(categories ?? []).map((cat) => (
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
          <CardContent className="py-12 text-center text-slate-500 text-sm space-y-3">
            <p>Pick a subject to start adding topics.</p>
            <p>
              You can also import scanned syllabus topics from{' '}
              <Link href="/createtask?mode=syllabus" className="text-indigo-300 hover:text-indigo-200">
                Create Task → Syllabus
              </Link>.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {isProgressError ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 backdrop-blur-xl">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p>Progress insights are temporarily unavailable. Topic editing still works normally.</p>
                <button
                  onClick={() => void refetchProgress()}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Retry progress
                </button>
              </div>
            </div>
          ) : null}
          {progressData ? <SyllabusProgressSection progress={progressData} /> : null}
          <TopicSection
            selectedCategoryId={selectedCategoryId}
            progressTopics={progressData?.topics ?? []}
            chapterProgress={progressData?.chapters ?? []}
            isProgressLoading={isProgressLoading}
          />
          <PrerequisiteSection selectedCategoryId={selectedCategoryId} />
        </>
      )}
    </div>
  );
}
