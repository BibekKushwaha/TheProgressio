// components/dashboard/QuickActions.tsx
import { Play, Plus, FileText } from 'lucide-react';

export function QuickActions() {
    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>

            <div className="space-y-3">
                <button className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:-translate-y-0.5">
                    <Play className="w-5 h-5 fill-current" />
                    Start Focus Session
                </button>

                <button className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300">
                    <Plus className="w-5 h-5" />
                    Add Task
                </button>

                <button className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300">
                    <FileText className="w-5 h-5" />
                    New Note
                </button>
            </div>
        </div>
    );
}