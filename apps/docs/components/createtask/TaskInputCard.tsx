'use client';

import { VoiceInput } from './VoiceInput';

interface TaskInputCardProps {
    value: string;
    onChange: (value: string) => void;
    isParsing?: boolean;
}

export function TaskInputCard({ value, onChange, isParsing }: TaskInputCardProps) {
    const handleVoiceResult = (text: string) => {
        onChange(value ? `${value} ${text}` : text);
    };

    return (
        <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl shadow-purple-500/10">
            <div className="relative">
                <textarea
                    className="w-full min-h-[120px] text-lg leading-relaxed focus:outline-none resize-none bg-transparent text-white placeholder-slate-400"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Describe your task..."
                />

                <div className="absolute bottom-0 right-0 flex items-center gap-3">
                    <div className="text-xs text-purple-400 flex items-center gap-2">
                        {isParsing && (
                            <>
                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>
                                AI Parsing…
                            </>
                        )}
                    </div>
                    <VoiceInput onResult={handleVoiceResult} isCompact />
                </div>
            </div>
        </div>
    );
}