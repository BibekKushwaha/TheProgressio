"use client";

import React, { useEffect } from "react";
import { X, Share2, Rocket, Award } from "lucide-react";

interface AchievementDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    achievement: {
        name: string;
        description: string;
        date: string;
        icon: React.ComponentType<any>;
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

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

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
                        <span className="inline-block px-4 py-1.5 bg-purple-600/40 border border-purple-500/50 rounded-full text-xs font-semibold text-purple-300 shadow-lg shadow-purple-500/20">
                            Unlocked on Oct 24, 2023
                        </span>
                    </div>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-3xl opacity-50 animate-pulse"></div>

                        <div className="relative w-32 h-32 bg-gradient-to-br from-purple-600/40 to-pink-600/40 border-2 border-purple-500/50 rounded-full flex items-center justify-center shadow-xl">
                            <Rocket className="w-16 h-16 text-purple-300" strokeWidth={1.5} />
                        </div>

                        <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 border-2 border-slate-900 rounded-full flex items-center justify-center shadow-lg">
                            <Award className="w-6 h-6 text-white" />
                        </div>
                    </div>

                    <h2
                        id="achievement-title"
                        className="text-3xl font-bold mb-3 bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent"
                    >
                        Deep Focus Master
                    </h2>

                    <p className="text-slate-300 mb-8 leading-relaxed">
                        You successfully completed{' '}
                        <span className="font-bold text-purple-300">50 hours</span> of deep focus
                        sessions this month!
                    </p>

                    <button className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-semibold text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 mb-8">
                        <Share2 className="w-5 h-5" />
                        Share Achievement
                    </button>

                    <div className="w-full">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                            Quick Share
                        </div>

                        <div className="flex items-center justify-center gap-4">
                            <button
                                className="w-12 h-12 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                aria-label="Share on X"
                            >
                                <svg className="w-5 h-5 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </button>

                            <button
                                className="w-12 h-12 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                aria-label="Share on LinkedIn"
                            >
                                <svg className="w-5 h-5 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                            </button>

                            <button
                                className="w-12 h-12 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                aria-label="Share on Instagram"
                            >
                                <svg className="w-5 h-5 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}