'use client';

import Link from 'next/link';
import { Lock, Award } from 'lucide-react';
import { achievementIconMap } from '@/lib/achievementIcons';

interface Badge {
    id: string | number;
    title: string;
    description: string;
    icon: string;
    unlocked: boolean;
    requirement: string | null;
    progress?: number;
}

interface BadgeCardProps {
    badge: Badge;
}

export function BadgeCard({ badge }: BadgeCardProps) {
    const IconComponent = achievementIconMap[badge.icon];

    return (
        <Link
            href={`/achievement/${badge.id}`}
            className={`group relative block bg-gradient-to-br backdrop-blur-md border rounded-2xl p-6 transition-all duration-300 ${badge.unlocked
                ? 'from-white/10 to-white/5 border-white/20 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1'
                : 'from-white/5 to-white/2 border-white/10 opacity-70 hover:opacity-100 hover:border-white/20'
                }`}
        >
            <div className="flex flex-col items-center text-center">
                <div
                    className={`relative w-20 h-20 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${badge.unlocked
                        ? 'bg-gradient-to-br from-purple-600/40 to-pink-600/40 border-2 border-purple-500/50 shadow-lg shadow-purple-500/30'
                        : 'bg-white/5 border-2 border-white/10 grayscale'
                        }`}
                >
                    {IconComponent ? (
                        <IconComponent className={`w-10 h-10 ${badge.unlocked ? 'text-purple-300' : 'text-slate-500'}`} />
                    ) : (
                        <span className="text-4xl">{badge.icon}</span>
                    )}

                    {!badge.unlocked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
                            <Lock className="w-8 h-8 text-slate-400" />
                        </div>
                    )}

                    {badge.unlocked && (
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 border-2 border-slate-950 rounded-full flex items-center justify-center">
                            <Award className="w-4 h-4 text-white" />
                        </div>
                    )}
                </div>

                <h3 className="text-xl font-bold mb-2">{badge.title}</h3>

                <p className="text-sm text-slate-400 mb-4 min-h-[40px]">
                    {badge.unlocked ? badge.description : badge.requirement}
                </p>

                {/* Progress bar for locked achievements */}
                {!badge.unlocked && typeof badge.progress === 'number' && (
                    <div className="w-full mb-4">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">
                            <span>Progress</span>
                            <span>{Math.round(badge.progress)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-purple-500/50 rounded-full transition-all duration-500"
                                style={{ width: `${badge.progress}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                <span
                    className={`px-3 py-1 border rounded-full text-xs font-semibold ${badge.unlocked
                        ? 'text-green-400 bg-green-500/20 border-green-500/30'
                        : 'text-slate-400 bg-slate-500/20 border-slate-500/30'
                        }`}
                >
                    {badge.unlocked ? 'COMPLETED' : 'LOCKED'}
                </span>
            </div>

            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-1 rounded-full uppercase">Details</span>
            </div>
        </Link>
    );
}