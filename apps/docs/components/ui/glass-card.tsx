import { cn } from "../../lib/utils";
import React from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    gradient?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({
    children,
    className,
    gradient = false,
    ...props
}) => {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md shadow-xl transition-all duration-300 hover:shadow-2xl hover:bg-black/30",
                gradient && "before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-br before:from-indigo-500/10 before:via-violet-500/5 before:to-blue-500/10",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};

export default GlassCard;
