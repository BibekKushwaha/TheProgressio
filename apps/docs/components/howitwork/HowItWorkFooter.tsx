'use client';

const LINKS = ['Privacy', 'Terms', 'Security', 'Contact'];

export function HowItWorkFooter() {
    return (
        <footer className="border-t border-white/5 py-10 px-6">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">TheProgressio</span>
                </div>

                <nav className="flex items-center gap-6">
                    {LINKS.map((link) => (
                        <a
                            key={link}
                            href="#"
                            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            {link}
                        </a>
                    ))}
                </nav>

                <p className="text-xs text-slate-600">
                    © 2024 TheProgressio · All rights reserved.
                </p>
            </div>
        </footer>
    );
}
