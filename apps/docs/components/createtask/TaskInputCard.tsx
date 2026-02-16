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
        <div className="group bg-slate-950/70 border border-white/10 rounded-2xl px-2 py-1 md:px-3 md:py-2 shadow-inner shadow-black/30">
            <div className="relative">
                <div
                    className="absolute inset-0 text-sm md:text-sm leading-none font-medium pointer-events-none whitespace-nowrap overflow-hidden text-transparent"
                    aria-hidden="true"
                >
                    <div className="text-white/90">{highlightedContent}</div>
                </div>

                <textarea
                    rows={1}
                    className="w-full min-h-[36px] md:min-h-[40px] text-sm md:text-sm leading-none font-medium focus:outline-none resize-none bg-transparent text-white placeholder-slate-600 relative z-10 caret-purple-400 overflow-hidden"
                    style={highlights.length > 0 ? { color: 'transparent', caretColor: '#c084fc' } : {}}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Describe your task..."
                />
            </div>

            <div className="flex items-center justify-between gap-2">
                {isParsing ? (
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                        <span className="truncate">AI is parsing…</span>
                    </div>
                ) : <span className="text-xs text-transparent select-none">status</span>}

                <VoiceInput onResult={handleVoiceResult} isCompact />
            </div>
        </div>
    );
}