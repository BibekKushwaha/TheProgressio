"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type Option<T extends string> = {
    label: string;
    value: T;
};

interface FilterDropdownProps<T extends string> {
    value: T;
    options: readonly Option<T>[];
    onChange: (value: T) => void;
    placeholder: string;
    icon?: ReactNode;
}

export function FilterDropdown<T extends string>({
    value,
    options,
    onChange,
    placeholder = "Select",
    icon = null,
}: FilterDropdownProps<T>) {
    const selected = options.find((o) => o.value === value);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className="flex items-center justify-center gap-2 px-4 bg-white/5 border border-white/10
                     rounded-xl hover:bg-white/10 transition-all duration-300 h-12"
                >
                    {icon}
                    <span className="hidden md:inline text-sm text-white">
                        {selected?.label || placeholder}
                    </span>
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-48 bg-slate-900/95 backdrop-blur-xl border-white/10"
            >
                {options.map((opt) => (
                    <DropdownMenuItem
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            "cursor-pointer text-white",
                            value === opt.value && "text-indigo-400"
                        )}
                    >
                        {opt.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}