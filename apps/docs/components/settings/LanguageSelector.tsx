'use client';

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

interface Language {
    code: string;
    name: string;
    nativeName: string;
    flag: string;
}

const LANGUAGES: Language[] = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
];

export function LanguageSelector() {
    const [selected, setSelected] = useState('en');

    useEffect(() => {
        const saved = localStorage.getItem('app-language');
        if (saved) setSelected(saved);
    }, []);

    const handleSelect = (code: string) => {
        setSelected(code);
        localStorage.setItem('app-language', code);
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-400">
                Select your preferred language. AI assistant and key UI labels will adapt accordingly.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {LANGUAGES.map(lang => (
                    <button
                        key={lang.code}
                        onClick={() => handleSelect(lang.code)}
                        className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${selected === lang.code
                                ? 'border-indigo-500/50 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                                : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                            }`}
                    >
                        <span className="text-2xl">{lang.flag}</span>
                        <div className="text-left">
                            <div className="text-sm font-bold text-white">{lang.name}</div>
                            <div className="text-xs text-slate-400">{lang.nativeName}</div>
                        </div>
                        {selected === lang.code && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                            </div>
                        )}
                    </button>
                ))}
            </div>
            {selected !== 'en' && (
                <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-400">
                    🚧 Full {LANGUAGES.find(l => l.code === selected)?.name} translation is coming soon. AI assistant already supports this language for doubt resolution.
                </div>
            )}
        </div>
    );
}
