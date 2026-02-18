"use client";

import { Plus, FileText, Sparkles } from 'lucide-react';
import { StartFocusButton } from '../planner/StartFocusButton';
import { useRouter } from 'next/navigation';

export function QuickActions() {
    const router = useRouter();
    const actionButtons = [
        {
            label: 'Add New Task',
            icon: Plus,
            onClick: () => router.push('/createtask'),
            className:
                'w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 active:scale-95',
        },
        {
            label: 'New Note',
            icon: FileText,
            className:
                'w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 active:scale-95 opacity-60 cursor-not-allowed',
        },
    ];

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 relative overflow-hidden group">
            {/* Decorative background sparkle */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full group-hover:bg-purple-500/20 transition-all duration-700"></div>

            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                Quick Actions
                <Sparkles className="w-5 h-5 text-purple-400 opacity-50" />
            </h2>

            <div className="space-y-3">
                <StartFocusButton isInline={true} />

                {actionButtons.map((button) => {
                    const Icon = button.icon;
                    return (
                        <button key={button.label} onClick={button.onClick} className={button.className}>
                            <Icon className="w-5 h-5" />
                            {button.label}
                        </button>
                    );
                })}
                <p className="text-[10px] text-center text-slate-500 font-medium uppercase tracking-widest mt-2">Notes coming soon</p>
            </div>
        </div>
    );
}
