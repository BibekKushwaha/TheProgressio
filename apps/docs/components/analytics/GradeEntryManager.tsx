'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    useAddGradeEntryMutation,
    useGetGradeEntriesQuery,
} from '@repo/store';
import type { GradeEntry } from '@repo/store';
import { Plus, GraduationCap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface GradeEntryManagerProps {
    examType?: string;
    allowExamTypeEdit?: boolean;
}

export function GradeEntryManager({ examType: controlledExamType, allowExamTypeEdit = true }: GradeEntryManagerProps) {
    const [examType, setExamType] = useState(controlledExamType || '');
    const [subjectName, setSubjectName] = useState('');
    const [obtainedMarks, setObtainedMarks] = useState('');
    const [totalMarks, setTotalMarks] = useState('100');
    const [addGradeEntry, { isLoading: isAdding }] = useAddGradeEntryMutation();

    useEffect(() => {
        if (controlledExamType) {
            setExamType(controlledExamType);
        }
    }, [controlledExamType]);

    const activeExamType = controlledExamType || examType;
    const { data, isLoading } = useGetGradeEntriesQuery({ examType: activeExamType || undefined });

    const entries: GradeEntry[] = data?.entries || [];
    const invalidInput = useMemo(() => {
        const marks = parseFloat(obtainedMarks);
        const total = parseFloat(totalMarks);
        return Number.isNaN(marks) || Number.isNaN(total) || total <= 0 || marks < 0 || marks > total;
    }, [obtainedMarks, totalMarks]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subjectName || !obtainedMarks || !activeExamType || invalidInput) return;
        await addGradeEntry({
            examType: activeExamType,
            subjectName,
            obtainedMarks: parseFloat(obtainedMarks),
            totalMarks: parseFloat(totalMarks),
        });
        setSubjectName('');
        setObtainedMarks('');
    };

    return (
        <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
                <GraduationCap className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-lg">Grade Entries</h3>
            </div>
            {controlledExamType && (
                <p className="text-xs text-slate-400 mb-4">
                    Tracking exam type: <span className="text-purple-300 font-semibold">{controlledExamType}</span>
                </p>
            )}

            <form onSubmit={handleAdd} className={`grid gap-3 mb-5 ${allowExamTypeEdit && !controlledExamType ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
                {allowExamTypeEdit && !controlledExamType && (
                    <Input
                        value={examType}
                        onChange={e => setExamType(e.target.value)}
                        placeholder="Exam type"
                        className="bg-white/5 border-white/10"
                    />
                )}
                <Input
                    value={subjectName}
                    onChange={e => setSubjectName(e.target.value)}
                    placeholder="Subject Name"
                    className="bg-white/5 border-white/10"
                />
                <div className="flex gap-2 flex-1">
                    <Input
                        value={obtainedMarks}
                        onChange={e => setObtainedMarks(e.target.value)}
                        placeholder="Score"
                        type="number"
                        step="any"
                        min="0"
                        className="bg-white/5 border-white/10"
                    />
                    <Input
                        value={totalMarks}
                        onChange={e => setTotalMarks(e.target.value)}
                        placeholder="Max"
                        type="number"
                        step="any"
                        min="1"
                        className="bg-white/5 border-white/10 w-24"
                    />
                </div>
                <Button
                    type="submit"
                    disabled={isAdding || !subjectName || !obtainedMarks || !activeExamType || invalidInput}
                    className="bg-purple-600 hover:bg-purple-500 text-white"
                >
                    <Plus className="w-4 h-4 mr-1.5" /> Add Score
                </Button>
            </form>

            {isLoading ? (
                <div className="text-sm text-slate-500 text-center py-4">Loading entries...</div>
            ) : entries.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-6">
                    No grade entries yet. Add your exam scores to get SWOT analysis.
                </div>
            ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {entries.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2.5">
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-500 uppercase tracking-wider">{entry.examType}</span>
                                <span className="text-sm font-semibold text-white">{entry.subjectName}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-white">
                                    {entry.obtainedMarks}/{entry.totalMarks}
                                    <span className="text-xs text-slate-400 ml-1">
                                        ({Math.round((entry.obtainedMarks / entry.totalMarks) * 100)}%)
                                    </span>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
