"use client";

import React, { memo, useState, useCallback, useEffect } from "react";
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
    Shield,
    type LucideIcon,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Card } from "../ui/card";
import { logout as logoutAction, useAppDispatch, useAppSelector, useLogoutMutation, selectIsAdmin } from "@repo/store";
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

type NavGroup = {
    section: string;
    items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
    {
        section: "Main",
        items: [
            { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            {
                name: "Tasks & Planning",
                icon: CheckSquare,
                href: "/planner",
                menuKey: "planner",
                children: [
                    { name: "Create New", href: "/createtask" },
                    { name: "Task Board", href: "/tasks" },
                    { name: "Task Archive", href: "/planner" },
                ],
            },
            { name: "Timetable", icon: Calendar, href: "/calendar" },
        ],
    },
    {
        section: "Academic",
        items: [
            { name: "Subject Library", icon: BookOpen, href: "/subjects" },
            { name: "Habit Tracker", icon: Flame, href: "/habits" },
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
        ],
    },
    {
        section: "Analytics & Review",
        items: [
            {
                name: "Analytics",
                icon: BarChart2,
                href: "/analytics",
                menuKey: "analytics",
                children: [
                    { name: "Strategic", href: "/analytics/strategic" },
                    { name: "Weekly Review", href: "/analytics/weekly-review" },
                ],
            },
            { name: "Achievements", icon: Award, href: "/achievement" },
        ],
    },
    {
        section: "Social",
        items: [
            { name: "Family Connect", icon: Users, href: "/family-connect" },
        ],
    },
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
    /** Show admin-only links when the current user has the ADMIN role. */
    isAdmin?: boolean;
}

const NavList = memo(function NavList({ pathname, onNavigate, isAdmin }: NavListProps) {
    const [openMenus, setOpenMenus] = useState<Record<MenuKey, boolean>>({
        planner:
            pathname.startsWith("/planner") ||
            pathname.startsWith("/tasks") ||
            pathname.startsWith("/createtask"),
        analytics: pathname.startsWith("/analytics"),
        "exam-warroom": pathname.startsWith("/exam-warroom"),
    });

    // Sync open state on SPA navigation — auto-open the active section when
    // the user navigates so the active child link is always visible.
    useEffect(() => {
        setOpenMenus((prev) => ({
            planner:
                prev.planner ||
                pathname.startsWith("/planner") ||
                pathname.startsWith("/tasks") ||
                pathname.startsWith("/createtask"),
            analytics:
                prev.analytics ||
                pathname.startsWith("/analytics"),
            "exam-warroom": prev["exam-warroom"] || pathname.startsWith("/exam-warroom"),
        }));
    }, [pathname]);

    const isActiveRoute = (href: string) =>
        pathname === href || pathname.startsWith(`${href}/`);

    const toggleMenu = (menuKey: MenuKey) =>
        setOpenMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));

    return (
        <nav className="flex-1 space-y-6 overflow-y-auto pr-2 pb-4">
            {NAV_GROUPS.map((group, groupIdx) => (
                <div key={group.section} className="space-y-1">
                    {/* Only show section headers for groups after the first one, or all if preferred. Let's show all but make Main subtle */}
                    <div className={cn(
                        "px-3 mb-2 text-[11px] font-semibold tracking-[0.15em] uppercase",
                        groupIdx === 0 ? "text-slate-600" : "text-slate-500 mt-6"
                    )}>
                        {group.section}
                    </div>
                    {group.items.map((item) => (
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
                                                    aria-current={isActiveRoute(child.href) ? "page" : undefined}
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
                                    aria-current={isActiveRoute(item.href) ? "page" : undefined}
                                    onClick={() => {
                                        trackFeatureOpened(item.href, pathname);
                                        onNavigate?.();
                                    }}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative outline-none",
                                        "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
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
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            ))}

            {/* Admin-only panel link */}
            {isAdmin && (
                <Link
                    href="/admin"
                    onClick={() => {
                        trackFeatureOpened("/admin", pathname);
                        onNavigate?.();
                    }}
                >
                    <div
                        className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative mt-6",
                            pathname === "/admin" || pathname.startsWith("/admin/")
                                ? "bg-red-500/20 text-red-300 shadow-lg shadow-red-500/10"
                                : "text-gray-400 hover:bg-red-500/10 hover:text-red-300"
                        )}
                    >
                        {(pathname === "/admin" || pathname.startsWith("/admin/")) && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-red-500 rounded-r-full" />
                        )}
                        <Shield
                            className={cn(
                                "w-5 h-5 transition-colors",
                                pathname === "/admin" || pathname.startsWith("/admin/")
                                    ? "text-red-400"
                                    : "group-hover:text-red-400"
                            )}
                        />
                        <span className="font-medium">Admin Panel</span>
                    </div>
                </Link>
            )}        </nav>
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
        <div className="mt-auto space-y-1">
            {/* ⌘K quick-actions hint */}
            <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-slate-600 select-none">
                <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px] text-slate-500">
                    ⌘K
                </kbd>
                <span>Quick actions</span>
            </div>
            <div className="border-t border-white/10 pt-3 space-y-1">
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
    const isUserAdmin = useAppSelector(selectIsAdmin);

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

                    <NavList pathname={pathname} isAdmin={isUserAdmin} />

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
                        <NavList pathname={pathname} onNavigate={closeMobileMenu} isAdmin={isUserAdmin} />
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
