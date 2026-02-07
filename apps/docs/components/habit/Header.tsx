// components/habit/Header.tsx
"use client"
import { selectCurrentUser, useAppSelector } from '@repo/store';
import { log } from 'console';
import { Search, Bell } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

export function Header({ searchQuery, setSearchQuery }: HeaderProps) {
    const user = useAppSelector(selectCurrentUser);
    return (
        <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl p-4 md:p-6">
            <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search habits…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                    />
                </div>

                <button className="relative p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20">
                    <Bell className="w-5 h-5 text-slate-300" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full"></span>
                </button>
                <Link href="/settings">
                    <div className="flex items-center gap-3 p-2 pr-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300 cursor-pointer">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center font-bold">
                            {user?.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="hidden lg:block">
                            <div className="text-sm font-semibold">{user?.username}</div>
                            <div className="text-xs text-slate-400">Level 12</div>
                        </div>
                    </div>
                </Link>
            </div>
        </header>
    );
}