import React from 'react';

interface DashboardGridProps {
    children: React.ReactNode; // Main content (left column)
    sidebar: React.ReactNode;  // Sidebar content (right column)
    /**
     * Optional slot rendered above the main content on mobile and at the top
     * of the sidebar column on desktop. Mount responsive content ONCE here
     * instead of duplicating it with lg:hidden / hidden lg:block.
     */
    sidebarHeader?: React.ReactNode;
}

export function DashboardGrid({ children, sidebar, sidebarHeader }: DashboardGridProps) {
    return (
        <>
            {/* Mobile: sidebarHeader sits above the main content column */}
            {sidebarHeader && (
                <div className="lg:hidden mb-4">{sidebarHeader}</div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                    {children}
                </div>
                <div className="space-y-4">
                    {/* Desktop: sidebarHeader at top of sidebar column */}
                    {sidebarHeader && (
                        <div className="hidden lg:block">{sidebarHeader}</div>
                    )}
                    {sidebar}
                </div>
            </div>
        </>
    );
}
