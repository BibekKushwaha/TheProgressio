import React from "react";
import { cn } from "@/lib/utils";

interface AuthHeaderProps {
    title: string;
    subtitle: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
    titleClassName?: string;
    subtitleClassName?: string;
}

const AuthHeader = ({
    title,
    subtitle,
    icon,
    className,
    titleClassName,
    subtitleClassName,
}: AuthHeaderProps) => {
    return (
        <div className={cn("mb-8 text-center", className)}>
            {icon}
            <h2 className={cn("text-3xl font-bold text-white mb-2", titleClassName)}>
                {title}
            </h2>
            <p className={cn("text-gray-400", subtitleClassName)}>
                {subtitle}
            </p>
        </div>
    );
};

export default AuthHeader;
