"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useGetUserXPQuery } from '@repo/store';

const FULL_LAYOUT = {
    showLiveActivity: true,
    showTopStats: true,
    showMorningBriefing: true,
    showQuickActions: true,
    showNotes: true,
    showActivityLedger: true,
    showWeeklyActivity: true,
    showTodaysTasks: true,
};

/** New users see a focused dashboard; experienced users see everything. */
const BEGINNER_LAYOUT = {
    showLiveActivity: false,
    showTopStats: true,
    showMorningBriefing: true,
    showQuickActions: true,
    showNotes: false,
    showActivityLedger: false,
    showWeeklyActivity: false,
    showTodaysTasks: true,
};

type LayoutType = typeof FULL_LAYOUT;

interface LayoutContextType {
    layout: LayoutType;
    toggleWidget: (key: keyof LayoutType) => void;
    isMounted: boolean;
}

const DashboardLayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function DashboardLayoutProvider({ children }: { children: ReactNode }) {
    const { data: xpData } = useGetUserXPQuery();
    const userLevel = xpData?.xp?.level ?? 1;
    const [layout, setLayout] = useState<LayoutType>(FULL_LAYOUT);
    const [isMounted, setIsMounted] = useState(false);
    const hasInitialized = useRef(false);

    // Run once on mount to load saved layout from localStorage.
    // If no saved layout exists, wait for XP data before choosing the default.
    useEffect(() => {
        setIsMounted(true);
        const saved = localStorage.getItem('dashboard-layout');
        if (saved) {
            try {
                setLayout({ ...FULL_LAYOUT, ...JSON.parse(saved) });
                hasInitialized.current = true;
            } catch (_e) {
                // Ignore
            }
        }
    }, []);

    // Apply level-aware default only when XP data arrives AND no saved layout exists.
    useEffect(() => {
        if (hasInitialized.current) return;
        if (!xpData) return; // XP data hasn't loaded yet
        hasInitialized.current = true;
        setLayout(userLevel >= 2 ? FULL_LAYOUT : BEGINNER_LAYOUT);
    }, [xpData, userLevel]);

    const toggleWidget = (key: keyof LayoutType) => {
        const newLayout = { ...layout, [key]: !layout[key] };
        setLayout(newLayout);
        localStorage.setItem('dashboard-layout', JSON.stringify(newLayout));
    };

    return (
        <DashboardLayoutContext.Provider value={{ layout, toggleWidget, isMounted }}>
            {children}
        </DashboardLayoutContext.Provider>
    );
}

export function useDashboardLayout() {
    const ctx = useContext(DashboardLayoutContext);
    if (!ctx) throw new Error("useDashboardLayout must be used within DashboardLayoutProvider");
    return ctx;
}

