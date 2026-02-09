// components/create-task/SubjectSelector.tsx
'use client';

import { BookOpen, Clock, Code, Calculator, Globe, Plus, Check, Hash } from 'lucide-react';
import { Category } from '@repo/store';

interface SubjectSelectorProps {
    selectedSubjectId: string | number;
    onSelect: (id: string | number) => void;
    categories?: Category[];
}

export function SubjectSelector({ selectedSubjectId, onSelect, categories = [] }: SubjectSelectorProps) {
    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Select Subject</h2>
                <button className="flex items-center gap-2 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                    <Plus className="w-4 h-4" />
                    New Subject
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {categories.map((subject) => {
                    const isSelected = selectedSubjectId === subject.id;
                    return (
                        <button
                            key={subject.id}
                            onClick={() => onSelect(subject.id)}
                            className={`relative group bg-gradient-to-br backdrop-blur-md border rounded-xl p-4 transition-all duration-300 ${isSelected
                                ? `${subject.colorCode} border-white/20 shadow-lg`
                                : 'from-white/5 to-white/2 border-white/10 hover:from-white/10 hover:to-white/5'
                                }`}
                        >
                            <div className="flex flex-col items-center gap-2">
                                <div
                                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-white/20' : 'bg-white/10'
                                        }`}
                                >
                                    <Hash className="w-6 h-6" />
                                </div>
                                <div className="text-center">
                                    <div className={`font-semibold text-sm ${isSelected ? 'text-white' : ''}`}>
                                        <span className={!isSelected ? `bg-gradient-to-r ${subject.colorCode} text-transparent bg-clip-text` : ''}>
                                            {subject.name}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-400">{isSelected ? 'Selected' : 'Click to select'}</div>
                                </div>
                            </div>

                            {isSelected && (
                                <div className="absolute top-2 right-2 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/20">
                                    <Check className="w-4 h-4 text-white" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}