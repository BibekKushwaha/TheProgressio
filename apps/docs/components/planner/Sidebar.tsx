// components/tasks/Sidebar.tsx
import { LayoutDashboard, CheckSquare, Calendar, TrendingUp, Settings, LogOut, GraduationCap, User, Dumbbell, Code } from 'lucide-react';

export function Sidebar() {
    const navItems = [
        { name: 'Overview', icon: LayoutDashboard, active: true, badge: null },
        { name: 'My Tasks', icon: CheckSquare, active: false, badge: 12 },
        { name: 'Calendar', icon: Calendar, active: false, badge: null },
        { name: 'Analytics', icon: TrendingUp, active: false, badge: null },
    ];

    const categories = [
        { name: 'Studies', icon: GraduationCap, color: 'bg-blue-500' },
        { name: 'Personal', icon: User, color: 'bg-purple-500' },
        { name: 'Fitness', icon: Dumbbell, color: 'bg-green-500' },
        { name: 'Coding', icon: Code, color: 'bg-orange-500' },
    ];

    return (
        <aside className="w-72 border-r border-white/10 bg-black/30 backdrop-blur-xl hidden lg:flex flex-col">
            <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-lg">
                        AS
                    </div>
                    <div>
                        <div className="font-semibold">Alex Student</div>
                        <div className="text-xs px-2 py-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full inline-block mt-1">
                            Pro Plan
                        </div>
                    </div>
                </div>
            </div>

            <nav className="flex-1 p-4 overflow-auto">
                <div className="mb-6">
                    {navItems.map((item) => (
                        <button
                            key={item.name}
                            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl mb-2 transition-all duration-300 ${item.active
                                    ? 'bg-gradient-to-r from-purple-600/40 to-pink-600/40 border border-purple-500/50 shadow-lg shadow-purple-500/20'
                                    : 'hover:bg-white/5'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className={`w-5 h-5 ${item.active ? 'text-purple-300' : 'text-slate-400'}`} />
                                <span className={item.active ? 'text-white font-semibold' : 'text-slate-400'}>
                                    {item.name}
                                </span>
                            </div>
                            {item.badge && (
                                <span className="px-2 py-0.5 bg-purple-500/30 border border-purple-500/50 rounded-full text-xs font-semibold">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="mb-6">
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-3 px-4">Categories</div>
                    {categories.map((category) => (
                        <button
                            key={category.name}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-2 hover:bg-white/5 transition-all duration-300"
                        >
                            <div className={`w-2 h-2 rounded-full ${category.color}`}></div>
                            <category.icon className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-400 text-sm">{category.name}</span>
                        </button>
                    ))}
                </div>
            </nav>

            <div className="p-4 border-t border-white/10 space-y-2">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all duration-300">
                    <Settings className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-400">Settings</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-400 transition-all duration-300">
                    <LogOut className="w-5 h-5" />
                    <span>Log Out</span>
                </button>
            </div>
        </aside>
    );
}