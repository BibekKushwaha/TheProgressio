import { Plus, X, LucideIcon } from 'lucide-react';

interface PageActionsProps {
    onSubmit: () => void;
    onCancel: () => void;
    isSubmitting?: boolean;
    submitLabel?: string;
    SubmitIcon?: LucideIcon;
}

export function PageActions({ onSubmit, onCancel, isSubmitting, submitLabel = "Add to My Gateway", SubmitIcon = Plus }: PageActionsProps) {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 backdrop-blur-xl bg-slate-950/80">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-4">
                <div className="flex items-center justify-end gap-4">
                    <button
                        onClick={onCancel}
                        className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 hover:border-white/15 transition-all duration-300 flex items-center gap-2 text-slate-300 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                        Cancel
                    </button>

                    <button
                        onClick={onSubmit}
                        disabled={isSubmitting}
                        className="group relative px-8 py-3 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 rounded-xl font-semibold shadow-2xl shadow-purple-500/40 hover:shadow-purple-500/60 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10"></div>
                        ) : (
                            <SubmitIcon className="w-5 h-5 relative z-10" />
                        )}
                        <span className="relative z-10">{submitLabel}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}