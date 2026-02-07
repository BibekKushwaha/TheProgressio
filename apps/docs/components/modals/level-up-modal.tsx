"use client";

import React from "react";
import { X, Star, Trophy, Zap } from "lucide-react";

interface LevelUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    level: number;
}

export default function LevelUpModal({ isOpen, onClose, level }: LevelUpModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Content */}
                <div className="text-center">
                    {/* Icon */}
                    <div className="mb-6 flex justify-center">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center animate-pulse">
                                <Trophy className="w-12 h-12 text-white" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                                <Star className="w-5 h-5 text-yellow-900 fill-yellow-900" />
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl font-bold text-white mb-2">Level Up!</h2>
                    <p className="text-slate-400 mb-6">Congratulations! You've reached level {level}</p>

                    {/* Stats */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-2xl font-bold text-white">{level}</div>
                                <div className="text-xs text-slate-400">New Level</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-indigo-400">+50 XP</div>
                                <div className="text-xs text-slate-400">Bonus Points</div>
                            </div>
                        </div>
                    </div>

                    {/* Unlocked Features */}
                    <div className="text-left mb-6">
                        <h3 className="text-sm font-bold text-white mb-3">New Features Unlocked:</h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                                <Zap className="w-5 h-5 text-yellow-400" />
                                <span className="text-sm text-slate-300">Advanced Analytics</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                                <Trophy className="w-5 h-5 text-indigo-400" />
                                <span className="text-sm text-slate-300">Custom Themes</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-indigo-500/20 transition-all"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}
