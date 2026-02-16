import React from 'react';

interface DurationSelectProps {
    value: number;
    onChange: (minutes: number) => void;
    className?: string;
}

export const DurationSelect: React.FC<DurationSelectProps> = ({ value, onChange, className = '' }) => {
    const options = [15, 20, 25, 30, 45, 60];
    return (
        <select
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className={`bg-slate-900 border border-white/10 text-white px-2 py-1 rounded-md text-sm ${className}`}
            aria-label="Session length in minutes"
        >
            {options.map((opt) => (
                <option key={opt} value={opt}>{opt} min</option>
            ))}
        </select>
    );
};

export default DurationSelect;
