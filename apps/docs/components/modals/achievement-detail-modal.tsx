"use client";

import React, { useEffect } from "react";
import { X, Share2, Award, LucideIcon, Target, Zap, Flame, Star, Trophy, Rocket } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
    'Target': Target,
    'Zap': Zap,
    'Flame': Flame,
    'Star': Star,
    'Trophy': Trophy,
    'Rocket': Rocket,
};

interface AchievementDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    achievement: {
        id: string | number;
        name: string;
        description: string;
        unlockedAt?: string;
        icon: string;
        unlocked: boolean;
        goalValue: number;
        type: string;
        progress: number;
    } | null;
}

export default function AchievementDetailModal({ isOpen, onClose, achievement }: AchievementDetailModalProps) {
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        const handleFocusTrap = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                const modal = document.getElementById('achievement-modal');
                if (!modal) return;

                const focusableElements = modal.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const firstElement = focusableElements[0] as HTMLElement;
                const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        document.addEventListener('keydown', handleEscape);
        document.addEventListener('keydown', handleFocusTrap);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('keydown', handleFocusTrap);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen || !achievement) return null;

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const IconComponent = iconMap[achievement.icon];
    const dateFormatted = achievement.unlockedAt
        ? new Date(achievement.unlockedAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        })
        : 'Not yet unlocked';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="achievement-title"
        >
            <div
                id="achievement-modal"
                className="relative w-full max-w-md bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-md border border-purple-500/30 rounded-2xl p-8 shadow-2xl shadow-purple-500/20 animate-in zoom-in-95 duration-300"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    aria-label="Close modal"
                >
                    <X className="w-5 h-5 text-slate-300" />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="mb-6">
                        <span className={`inline-block px-4 py-1.5 border rounded-full text-xs font-semibold shadow-lg ${achievement.unlocked
                                ? 'bg-purple-600/40 border-purple-500/50 text-purple-300 shadow-purple-500/20'
                                : 'bg-slate-800/40 border-slate-700 text-slate-400 shadow-black/20'
                            }`}>
                            {achievement.unlocked ? `Unlocked on ${dateFormatted}` : 'Locked'}
                        </span>
                    </div>

                    <div className="relative mb-6">
                        {achievement.unlocked && (
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-3xl opacity-50 animate-pulse"></div>
                        )}

                        <div className={`relative w-32 h-32 border-2 rounded-full flex items-center justify-center shadow-xl ${achievement.unlocked
                                ? 'bg-gradient-to-br from-purple-600/40 to-pink-600/40 border-purple-500/50'
                                : 'bg-slate-800/40 border-slate-700 grayscale opacity-50'
                            }`}>
                            {IconComponent ? (
                                <IconComponent className={`w-16 h-16 ${achievement.unlocked ? 'text-purple-300' : 'text-slate-500'}`} strokeWidth={1.5} />
                            ) : (
                                <span className="text-6xl">{achievement.icon}</span>
                            )}
                        </div>

                        {achievement.unlocked && (
                            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 border-2 border-slate-900 rounded-full flex items-center justify-center shadow-lg">
                                <Award className="w-6 h-6 text-white" />
                            </div>
                        )}
                    </div>

                    <h2
                        id="achievement-title"
                        className={`text-3xl font-bold mb-3 ${achievement.unlocked
                                ? 'bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent'
                                : 'text-slate-400'
                            }`}
                    >
                        {achievement.name}
                    </h2>

                    <p className="text-slate-300 mb-6 leading-relaxed">
                        {achievement.description}
                    </p>

                    {!achievement.unlocked && (
                        <div className="w-full mb-8">
                            <div className="flex justify-between text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">
                                <span>Progress</span>
                                <span>{Math.round(achievement.progress)}%</span>
                            </div>
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                                    style={{ width: `${achievement.progress}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                Requirement: {achievement.goalValue} {achievement.type.toLowerCase()}
                            </p>
                        </div>
                    )}

                    {achievement.unlocked ? (
                        <button className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-semibold text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 mb-4">
                            <Share2 className="w-5 h-5" />
                            Share Achievement
                        </button>
                    ) : (
                        <button
                            disabled
                            className="w-full px-8 py-4 bg-slate-800 border border-slate-700 rounded-full font-semibold text-slate-500 cursor-not-allowed mb-4"
                        >
                            Keep going to unlock!
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
