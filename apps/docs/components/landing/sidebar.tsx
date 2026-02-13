"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    CheckSquare,
    BarChart2,
    Settings,
    LogOut,
    Menu,
    Calendar,
    Flame,
    Swords,
    BookOpen,
    Users,
    X
} from "lucide-react";
import { cn } from "../../lib/utils";
import GlassCard from "../ui/glass-card";
import { logout as logoutAction, useAppDispatch, useLogoutMutation } from "@repo/store";
import { useToast } from "@/components/ui/toast-provider";

const Sidebar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { toast } = useToast();
    const [logoutApi, { isLoading: isLoggingOut }] = useLogoutMutation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { name: "Command Center", icon: LayoutDashboard, href: "/dashboard" },
        { name: "Tasks & Planning", icon: CheckSquare, href: "/planner" },
        { name: "Timetable", icon: Calendar, href: "/calendar" },
        { name: "Habit Gallery", icon: Flame, href: "/habits" },
        { name: "Analytics", icon: BarChart2, href: "/analytics" },
        { name: "Exam War Room", icon: Swords, href: "/exam-warroom" },
        { name: "Subject Library", icon: BookOpen, href: "/subjects" },
        { name: "Family Connect", icon: Users, href: "/family-connect" },
    ];

    const isActiveRoute = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

    const handleLogout = async () => {
        try {
            await logoutApi().unwrap();
            dispatch(logoutAction());
            if (typeof window !== "undefined") {
                localStorage.removeItem("auth:hasSession");
            }
            toast("Logged out successfully", "success");
            router.push("/login");
        } catch {
            toast("Failed to logout. Please try again.", "error");
        }
    };


    return (
        <>
            {/* Desktop Sidebar */}
            <div className="hidden lg:flex w-75 flex-col h-screen fixed left-0 top-0 p-4 z-50">
                <GlassCard className="h-full flex flex-col p-4" gradient>
                    <div className="flex items-center gap-2 px-2 mb-8 mt-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xl">
                            T
                        </div>
                        <Link href="/" className="text-xl font-bold text-white tracking-tight">Transition</Link>
                    </div>

                    <nav className="flex-1 space-y-1">
                        {navItems.map((item) => (
                            <Link key={item.href} href={item.href}>
                                <div className={cn(
                                    "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                                    isActiveRoute(item.href)
                                        ? "bg-white/10 text-white shadow-lg shadow-indigo-500/10"
                                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                                )}>
                                    {isActiveRoute(item.href) && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full" />
                                    )}
                                    <item.icon className={cn(
                                        "w-5 h-5 transition-colors",
                                        isActiveRoute(item.href) ? "text-indigo-400" : "group-hover:text-indigo-400"
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
                                isActiveRoute("/settings") && "bg-white/10 text-white"
                            )}>
                                <Settings className="w-5 h-5 group-hover:text-indigo-400" />
                                <span className="font-medium">Settings</span>
                            </div>
                        </Link>
                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group disabled:opacity-60"
                        >
                            <LogOut className="w-5 h-5 group-hover:text-red-400" />
                            <span className="font-medium">{isLoggingOut ? "Logging out..." : "Logout"}</span>
                        </button>
                    </div>
                </GlassCard>
            </div>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-950/80 backdrop-blur-md border-b border-white/10 z-50 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-white text-xl">
                        T
                    </div>
                    <span className="text-lg font-bold text-white">Transition</span>
                </div>
                <button 
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="text-white p-2"
                >
                    {mobileMenuOpen ? (
                        <X className="w-6 h-6" />
                    ) : (
                        <Menu className="w-6 h-6" />
                    )}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div 
                    className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Menu Drawer */}
            <div className={cn(
                "lg:hidden fixed left-0 top-16 bottom-0 w-80 z-40 transition-transform duration-300 ease-out",
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <GlassCard className="h-full flex flex-col p-4 m-4 rounded-2xl" gradient>
                    <nav className="flex-1 space-y-1">
                        {navItems.map((item) => (
                            <Link 
                                key={item.href} 
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <div className={cn(
                                    "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                                    isActiveRoute(item.href)
                                        ? "bg-white/10 text-white shadow-lg shadow-indigo-500/10"
                                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                                )}>
                                    {isActiveRoute(item.href) && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full" />
                                    )}
                                    <item.icon className={cn(
                                        "w-5 h-5 transition-colors",
                                        isActiveRoute(item.href) ? "text-indigo-400" : "group-hover:text-indigo-400"
                                    )} />
                                    <span className="font-medium">{item.name}</span>
                                </div>
                            </Link>
                        ))}
                    </nav>

                    <div className="mt-auto border-t border-white/10 pt-4 space-y-1">
                        <Link href="/settings" onClick={() => setMobileMenuOpen(false)}>
                            <div className={cn(
                                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group text-gray-400 hover:bg-white/5 hover:text-white",
                                isActiveRoute("/settings") && "bg-white/10 text-white"
                            )}>
                                <Settings className="w-5 h-5 group-hover:text-indigo-400" />
                                <span className="font-medium">Settings</span>
                            </div>
                        </Link>
                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group disabled:opacity-60"
                        >
                            <LogOut className="w-5 h-5 group-hover:text-red-400" />
                            <span className="font-medium">{isLoggingOut ? "Logging out..." : "Logout"}</span>
                        </button>
                    </div>
                </GlassCard>
            </div>
        </>
    );
};

export default Sidebar;
