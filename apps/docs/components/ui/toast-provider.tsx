'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => { } });

export const useToast = () => useContext(ToastContext);

const ICONS = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
};

const STYLES = {
    success: 'from-green-500/20 to-emerald-500/20 border-green-500/40 text-green-300',
    error: 'from-red-500/20 to-rose-500/20 border-red-500/40 text-red-300',
    info: 'from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-300',
};

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = nextId++;
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto-dismiss after 3s
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const dismiss = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            {children}

            {/* Toast container */}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                {toasts.map((t) => {
                    const Icon = ICONS[t.type];
                    return (
                        <div
                            key={t.id}
                            className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r ${STYLES[t.type]} backdrop-blur-xl border rounded-xl shadow-2xl shadow-black/30 animate-in slide-in-from-right-5 fade-in duration-300`}
                        >
                            <Icon className="w-5 h-5 shrink-0" />
                            <span className="text-sm font-semibold">{t.message}</span>
                            <button
                                onClick={() => dismiss(t.id)}
                                className="ml-2 p-0.5 hover:bg-white/10 rounded transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}
