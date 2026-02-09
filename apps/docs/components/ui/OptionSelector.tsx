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
                    className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${selected === option
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 border border-purple-500/50 shadow-lg shadow-purple-500/30'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                        }`}
                >
                    {renderOption(option)}
                </button>
            ))}
        </div>
    );
}
