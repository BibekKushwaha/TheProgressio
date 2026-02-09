// components/calendar/BreakBlock.tsx
import { Utensils } from 'lucide-react';

export function BreakBlock() {
    return (
        <div className="h-full border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center gap-2 text-slate-500">
            <Utensils className="w-5 h-5" />
            <span className="font-semibold">Lunch Break</span>
        </div>
    );
}