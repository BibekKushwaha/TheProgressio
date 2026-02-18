// components/focus-session/StrictModeToggle.tsx
'use client';

import { useState } from 'react';

export function StrictModeToggle() {
    const [enabled, setEnabled] = useState(true);

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="flex-1">
                <div className="font-semibold mb-1">Strict Mode</div>
                <div className="text-xs text-slate-400">Notifications blocked</div>
            </div>

            <button
                onClick={() => setEnabled(!enabled)}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${enabled ? 'bg-white' : 'bg-slate-700'
                    }`}
                aria-label="Toggle strict mode"
            >
                <div
                    className={`absolute top-1 w-4 h-4 rounded-full transition-all duration-300 ${enabled ? 'left-7 bg-slate-900' : 'left-1 bg-white'
                        }`}
                ></div>
            </button>
        </div>
    );
}