// components/focus-session/SessionComplete.tsx
import { Timer, ArrowRight } from 'lucide-react';
import { StatsGrid } from './StatsGrid';
import { RewardCard } from './RewardCard';
import { useSearchParams } from 'next/navigation';
import { useGetUserStreakQuery } from '@repo/store';

export function SessionComplete() {
    const searchParams = useSearchParams();
    const durationParam = Number(searchParams.get('duration')) || 25;
    const taskTitle = searchParams.get('task') || searchParams.get('goal') || 'Deep Work Session';

    const { data: streakData } = useGetUserStreakQuery();
    const streak = streakData?.streak ?? 0;

    // XP is earned based on session duration: 1 XP per 2 minutes
    const xpEarned = Math.round(durationParam / 2);

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-start p-6 pt-20">
            <div className="absolute top-20 left-20 w-4 h-4 bg-purple-500 rotate-45 animate-bounce"></div>
            <div className="absolute top-32 right-32 w-3 h-3 bg-indigo-500 rotate-12 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="absolute top-16 right-64 w-2 h-2 bg-pink-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>

            <div className="text-center mb-12">
                <h1 className="text-6xl font-bold mb-4">Session Complete!</h1>
                <p className="text-xl text-slate-400">
                    You are absolutely crushing your goals today.
                </p>
            </div>

            <div className="w-full max-w-4xl mb-8">
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-12 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600/30 to-indigo-600/30 rounded-full mb-6 border border-purple-500/30">
                        <Timer className="w-10 h-10 text-purple-400" />
                    </div>

                    <div className="text-7xl font-bold mb-2">{durationParam} Minutes</div>
                    <div className="text-xl text-purple-400 mb-8">Deep Focus Time</div>

                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Streak: {streak} days</span>
                        <span className="text-sm font-semibold text-purple-400">+{xpEarned} XP gained</span>
                        <span className="text-sm text-slate-400">{taskTitle}</span>
                    </div>

                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full" style={{ width: `${Math.min(100, (durationParam / 60) * 100)}%` }}></div>
                    </div>

                    <div className="text-xs text-slate-500">{durationParam} of 60 min daily target</div>
                </div>
            </div>

            <div className="w-full max-w-6xl mb-8">
                <StatsGrid taskTitle={taskTitle} />
            </div>

            <div className="w-full max-w-6xl mb-8">
                <RewardCard />
            </div>

            <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full font-bold text-lg shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2">
                Continue to Dashboard
                <ArrowRight className="w-5 h-5" />
            </button>
        </div>
    );
}
