// components/dashboard/Navbar.tsx
import { Bell, BarChart3 } from 'lucide-react';

export function Navbar() {
    const navLinks = ['Dashboard', 'Courses', 'Calendar', 'Reports'];

    return (
        <nav className="border-b border-white/10 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                                <BarChart3 className="w-5 h-5" />
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                StudyFlow
                            </span>
                        </div>

                        <div className="hidden md:flex items-center gap-1">
                            {navLinks.map((link) => (
                                <button
                                    key={link}
                                    className={`px-4 py-2 rounded-lg transition-all duration-300 ${link === 'Dashboard'
                                            ? 'bg-gradient-to-r from-purple-600/40 to-pink-600/40 border border-purple-500/50 text-white font-semibold'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {link}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative p-2 hover:bg-white/5 rounded-lg transition-all duration-300">
                            <Bell className="w-5 h-5 text-slate-300" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full"></span>
                        </button>

                        <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold cursor-pointer hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300">
                            A
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}