'use client';

import { useMemo, useState } from 'react';
import {
    Frequency,
    useCreateHabitMutation,
    useGetCategoriesQuery,
    useParseHabitMutation,
} from '@repo/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Wand2 } from 'lucide-react';
import { toCapturedHabitDraft } from '@/lib/capture';
import { trackLowInputEvent } from '@/lib/lowInputTelemetry';

const normalizeText = (value: string) => value.trim().toLowerCase();

export function HabitQuickCreate() {
    const { data: categories = [] } = useGetCategoriesQuery();
    const [parseHabit, { isLoading: isParsing }] = useParseHabitMutation();
    const [createHabit, { isLoading: isCreating }] = useCreateHabitMutation();

    const [input, setInput] = useState('');
    const [preview, setPreview] = useState<ReturnType<typeof toCapturedHabitDraft> | null>(null);

    const matchedCategory = useMemo(() => {
        const linkedCategoryName = preview?.draft.linkedCategoryName;
        if (!linkedCategoryName) return null;
        return categories.find((category) => normalizeText(category.name) === normalizeText(linkedCategoryName)) ?? null;
    }, [categories, preview]);

    const handlePreview = async () => {
        if (!input.trim()) {
            toast.error('Enter a habit idea first');
            return;
        }

        trackLowInputEvent('habit_parse_requested', 'text', {
            input_length: input.trim().length,
        });

        try {
            const parsed = await parseHabit({ text: input }).unwrap();
            setPreview(toCapturedHabitDraft(parsed, 'text'));
            trackLowInputEvent('habit_parse_succeeded', 'text', {
                confidence: parsed.confidence,
                has_schedule_hint: Boolean(parsed.scheduleHint),
                has_unit: Boolean(parsed.unit),
                frequency: parsed.frequency,
            });
        } catch {
            trackLowInputEvent('habit_parse_failed', 'text', {
                input_length: input.trim().length,
            });
            toast.error('Failed to parse habit idea');
        }
    };

    const handleCreate = async () => {
        if (!preview) return;

        try {
            await createHabit({
                name: preview.draft.name,
                frequency: preview.draft.frequency as Frequency,
                targetValue: preview.draft.targetValue,
                linkedCategoryId: matchedCategory?.id ?? null,
            }).unwrap();
            trackLowInputEvent('habit_quick_create_completed', 'text', {
                confidence: preview.confidence,
                has_schedule_hint: Boolean(preview.draft.scheduleHint),
                has_unit: Boolean(preview.draft.unit),
                linked_category: matchedCategory?.name ?? preview.draft.linkedCategoryName ?? null,
            });

            toast.success('Habit created');
            setInput('');
            setPreview(null);
        } catch {
            toast.error('Failed to create habit');
        }
    };

    return (
        <Card className="border-white/10 bg-white/[0.03] px-4">
            <div className="flex items-start justify-between gap-1">
                <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        Quick Habit Create
                    </h3>
                    <p className="text-xs text-slate-400">
                        Describe the habit once. Review the draft before saving.
                    </p>
                </div>
            </div>

            <div className="mt-1 flex flex-col gap-3 md:flex-row">
                <Input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="revise chemistry 20 min every day"
                    className="bg-white/5 border-white/10"
                />
                <Button
                    type="button"
                    onClick={handlePreview}
                    disabled={isParsing}
                    className="bg-fuchsia-600 hover:bg-fuchsia-500"
                >
                    <Wand2 className="w-4 h-4" />
                    {isParsing ? 'Parsing...' : 'Preview'}
                </Button>
            </div>

            {preview && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="grid grid-cols-1 gap-3 text-sm text-slate-200 md:grid-cols-5">
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Name</p>
                            <p>{preview.draft.name}</p>
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Frequency</p>
                            <p>{preview.draft.frequency}</p>
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Target</p>
                            <p>
                                {preview.draft.targetValue}
                                {preview.draft.unit ? ` ${preview.draft.unit}` : ''}
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Category</p>
                            <p>{matchedCategory?.name ?? preview.draft.linkedCategoryName ?? 'None'}</p>
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Schedule</p>
                            <p>{preview.draft.scheduleHint ?? 'Any time'}</p>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">
                            Confidence {(preview.confidence * 100).toFixed(0)}%
                        </p>
                        <Button
                            type="button"
                            onClick={handleCreate}
                            disabled={isCreating}
                            className="bg-emerald-600 hover:bg-emerald-500"
                        >
                            {isCreating ? 'Creating...' : 'Create Habit'}
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
}
