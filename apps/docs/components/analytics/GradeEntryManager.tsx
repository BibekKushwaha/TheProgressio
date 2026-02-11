'use client';

import { useState } from 'react';
import {
    useAddGradeEntryMutation,
    useGetGradeEntriesQuery,
} from '@repo/store';
import type { GradeEntry } from '@repo/store';
import { Plus, GraduationCap } from 'lucide-react';

export function GradeEntryManager() {
    const [examType, setExamType] = useState('');
    const [subjectName, setSubjectName] = useState('');
    const [obtainedMarks, setObtainedMarks] = useState('');
    const [totalMarks, setTotalMarks] = useState('100');
    const [addGradeEntry, { isLoading: isAdding }] = useAddGradeEntryMutation();
    const { data, isLoading } = useGetGradeEntriesQuery({ examType: examType || undefined });

    const entries: GradeEntry[] = data?.entries || [];

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subjectName || !obtainedMarks || !examType) return;
        await addGradeEntry({
            examType,
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

            <form onSubmit={handleAdd} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <input
                    value={examType}
                    onChange={e => setExamType(e.target.value)}
                    placeholder="Exam type"
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                />
                <input
                    value={subjectName}
                    onChange={e => setSubjectName(e.target.value)}
                    placeholder="Subject"
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                />
                <div className="flex gap-2">
                    <input
                        value={obtainedMarks}
                        onChange={e => setObtainedMarks(e.target.value)}
                        placeholder="Score"
                        type="number"
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 w-full"
                    />
                    <input
                        value={totalMarks}
                        onChange={e => setTotalMarks(e.target.value)}
                        placeholder="Max"
                        type="number"
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 w-20"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isAdding || !subjectName || !obtainedMarks || !examType}
                    className="flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
                >
                    <Plus className="w-4 h-4" /> Add
                </button>
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
