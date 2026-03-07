'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, BookOpen } from 'lucide-react';
import type { Category } from '@repo/store';

interface SubjectComboboxProps {
    categories: Category[] | undefined;
    value: string;
    onChange: (value: string) => void;
}

export function SubjectCombobox({ categories = [], value, onChange }: SubjectComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const filtered = (categories ?? []).filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    const selected = (categories ?? []).find(c => String(c.id) === value);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Focus search when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label="Select subject"
                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-left flex items-center justify-between transition-all hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
                <span className={selected ? 'text-white' : 'text-slate-500'}>
                    {selected ? selected.name : 'Select subject'}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Search input */}
                    <div className="p-2 border-b border-white/5">
                        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 h-9">
                            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search subjects..."
                                className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Options list */}
                    <div role="listbox" className="max-h-48 overflow-y-auto py-1">
                        {/* None / clear option */}
                        <button
                            type="button"
                            role="option"
                            aria-selected={!value}
                            onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${!value ? 'bg-purple-500/10 text-purple-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <BookOpen className="w-3.5 h-3.5 shrink-0 opacity-50" />
                            <span className="flex-1 text-left italic">No subject</span>
                            {!value && <Check className="w-3.5 h-3.5 text-purple-400" />}
                        </button>

                        {filtered.length === 0 && search ? (
                            <div className="px-3 py-4 text-sm text-slate-500 text-center">
                                No subjects match &quot;{search}&quot;
                            </div>
                        ) : (
                            filtered.map(cat => {
                                const isActive = String(cat.id) === value;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        role="option"
                                        aria-selected={isActive}
                                        onClick={() => { onChange(String(cat.id)); setIsOpen(false); setSearch(''); }}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-purple-500/10 text-purple-300' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        <BookOpen className="w-3.5 h-3.5 shrink-0 opacity-60" />
                                        <span className="flex-1 text-left truncate">{cat.name}</span>
                                        {isActive && <Check className="w-3.5 h-3.5 text-purple-400" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
