// components/dashboard/WelcomeHeader.tsx
import { CalendarDays } from 'lucide-react';

export function WelcomeHeader() {
    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                    Welcome back, Alex! 👋
                </h1>
                <p className="text-slate-400">
                    Let's make today productive. It's Tuesday, October 24.
                </p>
            </div>

            <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:-translate-y-0.5 w-fit">
                <CalendarDays className="w-5 h-5" />
                View Schedule
            </button>
        </div>
    );
}