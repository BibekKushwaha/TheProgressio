// components/focus-session/RewardCard.tsx
import { Award, Sparkles } from 'lucide-react';

export function RewardCard() {
    return (
        <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/20 backdrop-blur-md border border-purple-500/30 rounded-2xl p-8 text-center shadow-xl shadow-purple-500/20">
            <div className="inline-block mb-6 relative">
                <div className="absolute -top-2 -right-2">
                    <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
                </div>
                <div className="absolute -bottom-2 -left-2">
                    <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
                </div>

                <div className="w-32 h-32 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl shadow-purple-500/50">
                    <Award className="w-16 h-16" />
                </div>
            </div>

            <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">
                Daily Reward Unlocked
            </div>

            <h3 className="text-3xl font-bold mb-2">Focus Master</h3>
            <p className="text-slate-400 mb-6">Badge acquired</p>

            <button className="text-purple-400 font-semibold hover:text-purple-300 transition-colors">
                View Collection
            </button>
        </div>
    );
}