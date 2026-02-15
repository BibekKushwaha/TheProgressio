'use client';

import { useGetCategoriesQuery } from '@repo/store';
import { BookOpen, Beaker, Calculator, Globe, Music, Palette, Code, GraduationCap, Heart, Dumbbell } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

// Default icon mapping for common subjects
const SUBJECT_ICONS: Record<string, LucideIcon> = {
    math: Calculator,
    mathematics: Calculator,
    science: Beaker,
    physics: Beaker,
    chemistry: Beaker,
    biology: Heart,
    english: BookOpen,
    literature: BookOpen,
    history: Globe,
    geography: Globe,
    music: Music,
    art: Palette,
    computer: Code,
    programming: Code,
    coding: Code,
    'physical education': Dumbbell,
    pe: Dumbbell,
    default: GraduationCap,
};

function getSubjectIcon(name: string): LucideIcon {
    const lower = name.toLowerCase();
    for (const [key, icon] of Object.entries(SUBJECT_ICONS)) {
        if (lower.includes(key)) return icon;
    }
    return SUBJECT_ICONS.default!;
}

// Fallback colors when category doesn't have one
const FALLBACK_COLORS = [
    'from-purple-600/40 to-purple-500/40',
    'from-blue-600/40 to-blue-500/40',
    'from-pink-600/40 to-pink-500/40',
    'from-amber-600/40 to-amber-500/40',
    'from-emerald-600/40 to-emerald-500/40',
    'from-cyan-600/40 to-cyan-500/40',
];

interface SubjectCardsSidebarProps {
    selectedCategoryId?: string;
    onSelectCategory: (id: string | undefined) => void;
}

export function SubjectCardsSidebar({ selectedCategoryId, onSelectCategory }: SubjectCardsSidebarProps) {
    const { data: categories, isLoading } = useGetCategoriesQuery();
    const getItemClass = (isSelected: boolean) =>
        `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
            isSelected
                ? 'bg-white/15 border border-purple-500/40 shadow-sm shadow-purple-500/10'
                : 'bg-white/5 border border-transparent hover:bg-white/10'
        }`;

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
                ))}
            </div>
        );
    }

    if (!categories || categories.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-5">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Subjects</h3>

            <div className="space-y-2">
                {/* All categories option */}
                <button
                    onClick={() => onSelectCategory(undefined)}
                    className={getItemClass(!selectedCategoryId)}
                >
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-600/40 to-pink-600/40 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-white">All Subjects</span>
                </button>

                {categories.map((cat, idx) => {
                    const Icon = getSubjectIcon(cat.name);
                    const gradient = cat.colorCode || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
                    const isSelected = selectedCategoryId === cat.id;

                    return (
                        <button
                            key={cat.id}
                            onClick={() => onSelectCategory(isSelected ? undefined : cat.id)}
                            className={getItemClass(isSelected)}
                        >
                            <div className={`w-8 h-8 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center`}>
                                <Icon className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-white">{cat.name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
