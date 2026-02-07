import { cn } from "../../lib/utils";
import React from "react";

interface PageHeaderProps {
    title: string;
    description?: string;
    children?: React.ReactNode;
    className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    description,
    children,
    className
}) => {
    return (
        <div className={cn("flex flex-col gap-4 pb-8 md:flex-row md:items-center md:justify-between", className)}>
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight text-white bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    {title}
                </h1>
                {description && (
                    <p className="text-gray-400">
                        {description}
                    </p>
                )}
            </div>
            <div className="flex items-center gap-2">
                {children}
            </div>
        </div>
    );
};

export default PageHeader;
