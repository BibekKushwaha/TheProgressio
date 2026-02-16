"use client";

import React from "react";

interface OptionSelectorProps<T extends string | number> {
    options: T[];
    selected: T;
    onSelect: (option: T) => void;
    className?: string;
    renderOption?: (option: T) => React.ReactNode;
}

export function OptionSelector<T extends string | number>({
    options,
    selected,
    onSelect,
    className = "",
    renderOption = (option) => option,
}: OptionSelectorProps<T>) {
    return (
        <div className={`flex gap-3 ${className}`}>
            {options.map((option) => (
                <button
                    key={option}
                    onClick={() => onSelect(option)}
                    className={`flex-1 px-6 py-3.5 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${selected === option
                        ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 border border-purple-400/30 shadow-xl shadow-purple-500/30 text-white'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/15 text-slate-300 hover:text-white'
                        }`}
                >
                    {renderOption(option)}
                </button>
            ))}
        </div>
    );
}
