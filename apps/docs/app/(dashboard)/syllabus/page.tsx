'use client';

import { useState } from 'react';
import { useGetCategoriesQuery } from '@repo/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TopicSection } from './_components/TopicSection';
import { PrerequisiteSection } from './_components/PrerequisiteSection';

export default function SyllabusPage() {
  const { data: categories } = useGetCategoriesQuery();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

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
          <CardContent className="py-12 text-center text-slate-500 text-sm">
            Pick a subject to start adding topics.
          </CardContent>
        </Card>
      ) : (
        <>
          <TopicSection selectedCategoryId={selectedCategoryId} />
          <PrerequisiteSection selectedCategoryId={selectedCategoryId} />
        </>
      )}
    </div>
  );
}
