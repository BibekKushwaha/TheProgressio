import React from 'react';

interface DashboardGridProps {
    children: React.ReactNode; // Main content (left column)
    sidebar: React.ReactNode;  // Sidebar content (right column)
}

export function DashboardGrid({ children, sidebar }: DashboardGridProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
                {children}
            </div>
            <div className="space-y-4">
                {sidebar}
            </div>
        </div>
    );
}
