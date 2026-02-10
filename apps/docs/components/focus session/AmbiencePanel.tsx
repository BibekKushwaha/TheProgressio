// components/focus-session/AmbiencePanel.tsx
'use client';

import { Volume2, Droplets, Headphones } from 'lucide-react';
import { useState } from 'react';

export function AmbiencePanel() {
    const [activeSound, setActiveSound] = useState('rain');
    const [volume, setVolume] = useState(60);

    const sounds = [
        { id: 'whitenoise', icon: Volume2, label: 'White Noise' },
        { id: 'rain', icon: Droplets, label: 'Rain' },
        { id: 'music', icon: Headphones, label: 'Music' },
    ];

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 w-48">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Ambience
            </div>

            <div className="flex gap-2 mb-4">
                {sounds.map((sound) => (
                    <button
                        key={sound.id}
                        onClick={() => setActiveSound(sound.id)}
                        className={`flex-1 aspect-square rounded-xl flex items-center justify-center transition-all duration-300 ${activeSound === sound.id
                                ? 'bg-purple-600 shadow-lg shadow-purple-500/30'
                                : 'bg-white/5 hover:bg-white/10'
                            }`}
                        aria-label={sound.label}
                    >
                        <sound.icon className="w-5 h-5" />
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="flex-1 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:bg-purple-500
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:cursor-pointer"
                />
            </div>
        </div>
    );
}