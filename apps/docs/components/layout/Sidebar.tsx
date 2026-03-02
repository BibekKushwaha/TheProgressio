"use client";

import React, { memo, useState, useCallback } from "react";
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
    X,
    ChevronDown,
    Award,
    Layers,
    type LucideIcon,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Card } from "../ui/card";
import { logout as logoutAction, useAppDispatch, useLogoutMutation } from "@repo/store";
import { AUTH_SESSION_KEY } from "@/constant";
import { toast } from "sonner";
import { trackFeatureOpened } from "@/lib/navigationTelemetry";

type MenuKey = "planner" | "analytics" | "exam-warroom";
type NavChild = { name: string; href: string };
type NavItem = {
    name: string;
    icon: LucideIcon;
    href: string;
    menuKey?: MenuKey;
    children?: NavChild[];
};

const NAV_ITEMS: NavItem[] = [
    { name: "Command Center", icon: LayoutDashboard, href: "/dashboard" },
    {
        name: "Tasks & Planning",
        icon: CheckSquare,
        href: "/planner",
        menuKey: "planner",
        children: [
            { name: "Create New", href: "/createtask" },
            { name: "Task Board", href: "/tasks" },
            { name: "Expired Tasks", href: "/planner" },
            { name: "Syllabus Digitizer", href: "/syllabus-digitizer" },
        ],
    },
    { name: "Timetable", icon: Calendar, href: "/calendar" },
    { name: "Habit Gallery", icon: Flame, href: "/habits" },
    {
        name: "Analytics",
        icon: BarChart2,
        href: "/analytics",
        menuKey: "analytics",
        children: [
            { name: "Overview", href: "/analytics/overview" },
            { name: "Strategic", href: "/analytics/strategic" },
            { name: "Weekly Review", href: "/analytics/weekly-review" },
        ],
    },
    {
        name: "Exam War Room",
        icon: Swords,
        href: "/exam-warroom",
        menuKey: "exam-warroom",
        children: [
            { name: "Overview", href: "/exam-warroom/overview" },
            { name: "Academic", href: "/exam-warroom/academic" },
            { name: "Revision", href: "/exam-warroom/revision" },
        ],
    },
    { name: "Subject Library", icon: BookOpen, href: "/subjects" },
    { name: "Syllabus Graph", icon: Layers, href: "/syllabus" },
    { name: "Achievements", icon: Award, href: "/achievement" },
    { name: "Family Connect", icon: Users, href: "/family-connect" },
];

// ---------------------------------------------------------------------------
// NavList — isolated, memoized nav tree.
// Renders once for desktop (onNavigate = undefined) and once for mobile
// (onNavigate = () => setMobileMenuOpen(false)).  Using a proper component
// instead of an inline render-function lets React diff only the changed tree
// rather than always treating both trees as new.
// ---------------------------------------------------------------------------
interface NavListProps {
    pathname: string;
    /** Called after a nav item is clicked. Mobile passes the menu-close fn. */
    onNavigate?: () => void;
}

const NavList = memo(function NavList({ pathname, onNavigate }: NavListProps) {
    const [openMenus, setOpenMenus] = useState<Record<MenuKey, boolean>>({
        planner:
            pathname.startsWith("/planner") ||
            pathname.startsWith("/tasks") ||
            pathname.startsWith("/createtask") ||
            pathname.startsWith("/syllabus-digitizer"),
        analytics: pathname.startsWith("/analytics"),
        "exam-warroom": pathname.startsWith("/exam-warroom"),
    });

    const isActiveRoute = (href: string) =>
        pathname === href || pathname.startsWith(`${href}/`);

    const toggleMenu = (menuKey: MenuKey) =>
        setOpenMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));

    return (
        <nav className="flex-1 space-y-1 overflow-y-auto pr-2">
            {NAV_ITEMS.map((item) => (
                <div key={item.href}>
                    {item.children ? (
                        <>
                            <button
                                type="button"
                                onClick={() => item.menuKey && toggleMenu(item.menuKey)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                                    isActiveRoute(item.href) || (item.menuKey && openMenus[item.menuKey])
                                        ? "bg-white/10 text-white shadow-lg shadow-indigo-500/10"
                                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                {(isActiveRoute(item.href) || (item.menuKey && openMenus[item.menuKey])) && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full" />
                                )}
                                <item.icon
                                    className={cn(
                                        "w-5 h-5 transition-colors",
                                        isActiveRoute(item.href) || (item.menuKey && openMenus[item.menuKey])
                                            ? "text-indigo-400"
                                            : "group-hover:text-indigo-400"
                                    )}
                                />
                                <span className="font-medium">{item.name}</span>
                                <ChevronDown
                                    className={cn(
                                        "ml-auto h-4 w-4 transition-transform",
                                        item.menuKey && openMenus[item.menuKey] && "rotate-180"
                                    )}
                                />
                            </button>
                            {item.menuKey && openMenus[item.menuKey] && (
                                <div className="ml-6 mt-1 space-y-1">
                                    {item.children.map((child) => (
                                        <Link
                                            key={child.href}
                                            href={child.href}
                                            onClick={() => {
                                                trackFeatureOpened(child.href, pathname);
                                                onNavigate?.();
                                            }}
                                            className={cn(
                                                "block px-3 py-2 rounded-lg text-sm transition-colors",
                                                isActiveRoute(child.href)
                                                    ? "bg-indigo-500/20 text-indigo-300"
                                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            {child.name}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <Link
                            href={item.href}
                            onClick={() => {
                                trackFeatureOpened(item.href, pathname);
                                onNavigate?.();
                            }}
                        >
                            <div
                                className={cn(
                                    "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                                    isActiveRoute(item.href)
                                        ? "bg-white/10 text-white shadow-lg shadow-indigo-500/10"
                                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                {isActiveRoute(item.href) && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full" />
                                )}
                                <item.icon
                                    className={cn(
                                        "w-5 h-5 transition-colors",
                                        isActiveRoute(item.href) ? "text-indigo-400" : "group-hover:text-indigo-400"
                                    )}
                                />
                                <span className="font-medium">{item.name}</span>
                            </div>
                        </Link>
                    )}
                </div>
            ))}
        </nav>
    );
});

// ---------------------------------------------------------------------------
// BottomActions — settings link + logout button, shared by both sidebars.
// ---------------------------------------------------------------------------
interface BottomActionsProps {
    pathname: string;
    isLoggingOut: boolean;
    onLogout: () => void;
    onNavigate?: () => void;
}

const BottomActions = memo(function BottomActions({
    pathname,
    isLoggingOut,
    onLogout,
    onNavigate,
}: BottomActionsProps) {
    const isActiveRoute = (href: string) =>
        pathname === href || pathname.startsWith(`${href}/`);

    return (
        <div className="mt-auto border-t border-white/10 pt-4 space-y-1">
            <Link
                href="/settings"
                onClick={() => {
                    trackFeatureOpened("/settings", pathname);
                    onNavigate?.();
                }}
            >
                <div
                    className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group text-gray-400 hover:bg-white/5 hover:text-white",
                        isActiveRoute("/settings") && "bg-white/10 text-white"
                    )}
                >
                    <Settings className="w-5 h-5 group-hover:text-indigo-400" />
                    <span className="font-medium">Settings</span>
                </div>
            </Link>
            <button
                onClick={onLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group disabled:opacity-60"
            >
                <LogOut className="w-5 h-5 group-hover:text-red-400" />
                <span className="font-medium">{isLoggingOut ? "Logging out..." : "Logout"}</span>
            </button>
        </div>
    );
});

// ---------------------------------------------------------------------------
// Sidebar — shell that mounts desktop panel + mobile header/drawer.
// The mobile drawer is lazy-mounted (first open) to avoid paying its render
// cost before it's ever used, yet the CSS translate keeps the slide animation.
// ---------------------------------------------------------------------------
const Sidebar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const [logoutApi, { isLoading: isLoggingOut }] = useLogoutMutation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    // Track whether the mobile drawer has ever been opened so we can lazy-mount it.
    const [mobileEverOpened, setMobileEverOpened] = useState(false);

    const handleLogout = async () => {
        try {
            await logoutApi().unwrap();
            dispatch(logoutAction());
            if (typeof window !== "undefined") {
                localStorage.removeItem(AUTH_SESSION_KEY);
            }
            toast.success("Logged out successfully");
            router.push("/login");
        } catch {
            toast.error("Failed to logout. Please try again.");
        }
    };

    const openMobileMenu = () => {
        if (!mobileEverOpened) setMobileEverOpened(true);
        setMobileMenuOpen(true);
    };

    const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

    return (
        <>
            {/* ── Desktop Sidebar ── */}
            <div className="hidden lg:flex w-72 flex-col h-screen scroll fixed left-0 top-0 z-50">
                <Card variant="glass" className="h-full flex flex-col p-4">
                    <div className="flex items-center gap-2 px-2 mb-8 mt-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xl">
                            T
                        </div>
                        <Link href="/" className="text-xl font-bold text-white tracking-tight">
                            TheProgressio
                        </Link>
                    </div>

                    <NavList pathname={pathname} />

                    <BottomActions
                        pathname={pathname}
                        isLoggingOut={isLoggingOut}
                        onLogout={handleLogout}
                    />
                </Card>
            </div>

            {/* ── Mobile Header ── */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-950/80 backdrop-blur-md border-b border-white/10 z-50 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xl">
                        T
                    </div>
                    <span className="text-lg font-bold text-white">TheProgressio</span>
                </div>
                <button
                    onClick={mobileMenuOpen ? closeMobileMenu : openMobileMenu}
                    className="text-white p-2"
                    aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                >
                    {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* ── Mobile Overlay ── */}
            {mobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    onClick={closeMobileMenu}
                />
            )}

            {/* ── Mobile Drawer ── lazy-mounted on first open, then kept in DOM for animation ── */}
            {mobileEverOpened && (
                <div
                    className={cn(
                        "lg:hidden fixed left-0 top-16 bottom-0 w-80 z-40 transition-transform duration-300 ease-out",
                        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                >
                    <Card variant="glass" className="h-full flex flex-col p-4 m-4 rounded-2xl">
                        <NavList pathname={pathname} onNavigate={closeMobileMenu} />
                        <BottomActions
                            pathname={pathname}
                            isLoggingOut={isLoggingOut}
                            onLogout={handleLogout}
                            onNavigate={closeMobileMenu}
                        />
                    </Card>
                </div>
            )}
        </>
    );
};

export default Sidebar;
