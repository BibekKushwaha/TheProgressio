"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    CheckSquare,
    Trophy,
    BarChart2,
    Settings,
    LogOut,
    Menu,
    Calendar
} from "lucide-react";
import { cn } from "../../lib/utils";
import GlassCard from "../auth/glass-card";

const Sidebar = () => {
    const pathname = usePathname();

    const navItems = [
        { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
        { name: "Analytics", icon: BarChart2, href: "/analytics" },
        { name: "Habits", icon: Trophy, href: "/habits" },
        { name: "Planner", icon: Calendar, href: "/planner" },
        { name: "Achievements", icon: Trophy, href: "/achievements" },
        { name: "Reports", icon: BarChart2, href: "/reports" },
    ];


    return (
        <>
            {/* Desktop Sidebar */}
            <div className="hidden lg:flex w-85 flex-col h-screen fixed left-0 top-0 p-4 z-50">
                <GlassCard className="h-full flex flex-col p-4" gradient>
                    <div className="flex items-center gap-2 px-2 mb-8 mt-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xl">
                            T
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight">Transition</span>
                    </div>

                    <nav className="flex-1 space-y-1">
                        {navItems.map((item) => (
                            <Link key={item.href} href={item.href}>
                                <div className={cn(
                                    "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                                    pathname === item.href
                                        ? "bg-white/10 text-white shadow-lg shadow-indigo-500/10"
                                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                                )}>
                                    {pathname === item.href && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full" />
                                    )}
                                    <item.icon className={cn(
                                        "w-5 h-5 transition-colors",
                                        pathname === item.href ? "text-indigo-400" : "group-hover:text-indigo-400"
                                    )} />
                                    <span className="font-medium">{item.name}</span>
                                </div>
                            </Link>
                        ))}
                    </nav>

                    <div className="mt-auto border-t border-white/10 pt-4 space-y-1">
                        <Link href="/settings">
                            <div className={cn(
                                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group text-gray-400 hover:bg-white/5 hover:text-white",
                                pathname === "/settings" && "bg-white/10 text-white"
                            )}>
                                <Settings className="w-5 h-5 group-hover:text-indigo-400" />
                                <span className="font-medium">Settings</span>
                            </div>
                        </Link>
                        <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group">
                            <LogOut className="w-5 h-5 group-hover:text-red-400" />
                            <span className="font-medium">Logout</span>
                        </button>
                    </div>
                </GlassCard>
            </div>

            {/* Mobile Header (Placeholder for mobile Nav) */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-950/80 backdrop-blur-md border-b border-white/10 z-50 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold">
                        T
                    </div>
                    <span className="text-lg font-bold text-white">Transition</span>
                </div>
                <button className="text-white p-2">
                    <Menu className="w-6 h-6" />
                </button>
            </div>
        </>
    );
};

export default Sidebar;
