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
        <div className="flex items-center justify-end gap-4 pt-6">
            <button
                onClick={onCancel}
                className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300 flex items-center gap-2"
            >
                <X className="w-5 h-5" />
                Cancel
            </button>

            <button
                onClick={onSubmit}
                disabled={isSubmitting}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <SubmitIcon className="w-5 h-5" />
                )}
                {submitLabel}
            </button>
        </div>
    );
}