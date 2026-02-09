// components/dashboard/Navbar.tsx
"use client";
import { useAppSelector } from '@repo/store';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Calendar, Trophy, Settings, User as UserIcon, LogOut, Search, Plus, Sparkles } from 'lucide-react';

type NavbarProps = {
    navLinks: string[];
    buttonText?: string;
    onClick?: () => void;
}

const linkMapping: Record<string, string> = {
    'Dashboard': '/dashboard',
    'Overview': '/planner',
    'Calendar': '/calendar',
    'Achievements': '/achievements',
    'Courses': '/courses',
    'Reports': '/reports',
    'Planner': '/planner'
};

const linkIcons: Record<string, any> = {
    'Dashboard': LayoutDashboard,
    'Overview': Sparkles,
    'Calendar': Calendar,
    'Achievements': Trophy,
    'Courses': LayoutDashboard,
    'Reports': Sparkles,
};

export function Navbar({ navLinks, buttonText, onClick }: NavbarProps) {
    const user = useAppSelector((state) => state.auth.user);
    const router = useRouter();
    const pathname = usePathname();

    const handleButtonClick = () => {
        if (onClick) {
            onClick();
        } else {
            router.push('/createtask');
        }
    };

    return (
        <nav className="border-b border-white/10 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-8">
                        {/* Navigation Links */}
                        <div className="hidden md:flex items-center gap-1">
                            {navLinks.map((link, index) => {
                                const href = linkMapping[link] || '#';
                                const isActive = pathname === href;
                                const Icon = linkIcons[link];

                                return (
                                    <Link
                                        key={index}
                                        href={href}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${isActive
                                            ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 text-white font-semibold'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        {Icon && <Icon className="w-4 h-4" />}
                                        {link}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Search shortcut or other icon could go here */}

                        {buttonText && (
                            <button
                                className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/40 transition-all duration-300 hover:-translate-y-0.5"
                                onClick={handleButtonClick}
                            >
                                <Plus className="w-4 h-4" />
                                {buttonText}
                            </button>
                        )}

                    </div>
                </div>
            </div>
        </nav>
    );
}