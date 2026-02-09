'use client';

import { VoiceInput } from './VoiceInput';
import React, { useMemo } from 'react';

interface TokenHighlight {
    text: string;
    type: 'subject' | 'date' | 'time';
}

interface TaskInputCardProps {
    value: string;
    onChange: (value: string) => void;
    isParsing?: boolean;
    highlights?: TokenHighlight[];
}

const HIGHLIGHT_COLORS: Record<string, string> = {
    subject: 'bg-purple-500/30 text-purple-300 rounded px-0.5',
    date: 'bg-pink-500/30 text-pink-300 rounded px-0.5',
    time: 'bg-amber-500/30 text-amber-300 rounded px-0.5',
};

function buildHighlightedText(text: string, highlights: TokenHighlight[]) {
    if (!highlights.length) return <span>{text}</span>;

    // Find all highlight positions
    const positions: { start: number; end: number; type: string }[] = [];
    for (const h of highlights) {
        const idx = text.toLowerCase().indexOf(h.text.toLowerCase());
        if (idx >= 0) {
            positions.push({ start: idx, end: idx + h.text.length, type: h.type });
        }
    }

    // Sort by start position
    positions.sort((a, b) => a.start - b.start);

    // Build fragments
    const fragments: React.ReactNode[] = [];
    let lastIdx = 0;

    for (let i = 0; i < positions.length; i++) {
        const pos = positions[i]!;
        // Add text before this highlight
        if (pos.start > lastIdx) {
            fragments.push(<span key={`t-${lastIdx}`}>{text.slice(lastIdx, pos.start)}</span>);
        }
        // Add highlighted token
        fragments.push(
            <span key={`h-${i}`} className={`${HIGHLIGHT_COLORS[pos.type]} transition-all duration-300`}>
                {text.slice(pos.start, pos.end)}
            </span>
        );
        lastIdx = pos.end;
    }

    // Add remaining text
    if (lastIdx < text.length) {
        fragments.push(<span key={`t-${lastIdx}`}>{text.slice(lastIdx)}</span>);
    }

    return <>{fragments}</>;
}

export function TaskInputCard({ value, onChange, isParsing, highlights = [] }: TaskInputCardProps) {
    const handleVoiceResult = (text: string) => {
        onChange(value ? `${value} ${text}` : text);
    };

    const highlightedContent = useMemo(
        () => buildHighlightedText(value, highlights),
        [value, highlights]
    );

    return (
        <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl shadow-purple-500/10">
            <div className="relative">
                {/* Highlight overlay — positioned behind the textarea */}
                <div
                    className="absolute inset-0 text-lg leading-relaxed pointer-events-none whitespace-pre-wrap break-words text-transparent"
                    aria-hidden="true"
                >
                    <div className="text-white/90">{highlightedContent}</div>
                </div>

                <textarea
                    className="w-full min-h-[120px] text-lg leading-relaxed focus:outline-none resize-none bg-transparent text-white placeholder-slate-400 relative z-10 caret-white"
                    style={highlights.length > 0 ? { color: 'transparent', caretColor: 'white' } : {}}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Describe your task..."
                />

                <div className="absolute bottom-0 right-0 flex items-center gap-3 z-20">
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