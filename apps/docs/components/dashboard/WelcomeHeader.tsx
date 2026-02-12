// components/dashboard/WelcomeHeader.tsx
"use client";
import { CalendarDays } from 'lucide-react';
import { useAppSelector } from '@repo/store';
import { useRouter } from 'next/navigation';

export function WelcomeHeader() {
    const user = useAppSelector((state) => state.auth.user);
    const router = useRouter();

    const handleViewSchedule = () => {
        router.push('/calendar');
    };

    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h1 className="text-2xl md:text-2.5xl font-bold ">
                    Welcome back, {user?.username} 👋
                </h1>
                <p className="text-slate-400">
                    Let&apos;s make today productive. It&apos;s {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                </p>
            </div>

            <button 
                onClick={handleViewSchedule}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:-translate-y-0.5 w-fit"
            >
                <CalendarDays className="w-5 h-5" />
                View Schedule
            </button>
        </div>
    );
}
