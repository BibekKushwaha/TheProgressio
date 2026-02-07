import { cn } from "../../lib/utils";
import React from "react";
import { Loader2 } from "lucide-react";

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    isLoading?: boolean;
    variant?: "primary" | "secondary" | "danger" | "outline";
    fullWidth?: boolean;
}

const GradientButton: React.FC<GradientButtonProps> = ({
    children,
    className,
    isLoading,
    variant = "primary",
    fullWidth = false,
    disabled,
    ...props
}) => {
    const baseStyles = "relative flex items-center justify-center rounded-lg px-6 py-3 font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";

    const variants = {
        primary: "bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 text-white hover:shadow-lg hover:shadow-indigo-500/25 focus:ring-indigo-500",
        secondary: "bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm focus:ring-slate-500",
        danger: "border border-red-500/50 text-red-400 hover:bg-red-500/10 focus:ring-red-500",
        outline: "border border-white/20 text-white hover:bg-white/5 focus:ring-slate-500"
    };

    return (
        <button
            className={cn(
                baseStyles,
                variants[variant],
                fullWidth && "w-full",
                className
            )}
            disabled={isLoading || disabled}
            {...props}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {children}
        </button>
    );
};

export default GradientButton;
