'use client';

const categories = [
    { id: 'all', label: 'All Badges' },
    { id: 'unlocked', label: 'Unlocked' },
    { id: 'locked', label: 'In Progress' },
    { id: 'legendary', label: 'Legendary' },
];

interface BadgesTabsProps {
    activeTab: string;
    onTabChange: (id: string) => void;
}

export function BadgesTabs({ activeTab, onTabChange }: BadgesTabsProps) {
    return (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
            {categories.map((category) => (
                <button
                    key={category.id}
                    onClick={() => onTabChange(category.id)}
                    className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === category.id
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    {category.label}
                </button>
            ))}
        </div>
    );
}
