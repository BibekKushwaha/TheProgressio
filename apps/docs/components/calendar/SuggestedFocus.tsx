// components/calendar/SuggestedFocus.tsx
import { Sparkles } from 'lucide-react';

export function SuggestedFocus() {
    return (
        <div className="h-full bg-gradient-to-br from-purple-900/30 to-indigo-900/20 backdrop-blur-md border border-purple-500/30 rounded-xl flex items-center gap-3 px-4 shadow-lg shadow-purple-500/20">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <div>
                <div className="font-bold text-purple-300">Suggested Focus: Calculus</div>
                <div className="text-xs text-purple-400/70">Based on your upcoming test on Friday</div>
            </div>
        </div>
    );
}