'use client';

import { Droplets, Headphones, Play, Square, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState, type MutableRefObject } from 'react';

type AmbienceId = 'whitenoise' | 'rain' | 'music';

type EngineHandle = {
    stop: () => void;
};

const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    return new AudioContextCtor();
};

const createNoiseSource = (context: AudioContext, color: 'white' | 'brown') => {
    const sampleRate = context.sampleRate;
    const buffer = context.createBuffer(1, sampleRate * 2, sampleRate);
    const data = buffer.getChannelData(0);

    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
        const white = Math.random() * 2 - 1;
        if (color === 'brown') {
            last = (last + 0.02 * white) / 1.02;
            data[i] = last * 3.5;
        } else {
            data[i] = white * 0.35;
        }
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
};

const createMusicSource = (context: AudioContext) => {
    const gain = context.createGain();
    gain.gain.value = 0.12;

    const carrier = context.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = 220;

    const lfo = context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.16;
    const lfoGain = context.createGain();
    lfoGain.gain.value = 25;

    lfo.connect(lfoGain);
    lfoGain.connect(carrier.frequency);
    carrier.connect(gain);

    return {
        output: gain,
        start: () => {
            lfo.start();
            carrier.start();
        },
        stop: () => {
            lfo.stop();
            carrier.stop();
        },
    };
};

const buildEngine = async (
    sound: AmbienceId,
    gainNode: GainNode,
    contextRef: MutableRefObject<AudioContext | null>,
): Promise<EngineHandle | null> => {
    const context = contextRef.current ?? getAudioContext();
    if (!context) return null;
    contextRef.current = context;

    if (context.state === 'suspended') {
        await context.resume();
    }

    if (sound === 'music') {
        const music = createMusicSource(context);
        music.output.connect(gainNode);
        music.start();
        return { stop: music.stop };
    }

    const source = createNoiseSource(context, sound === 'rain' ? 'brown' : 'white');
    const filter = context.createBiquadFilter();
    filter.type = sound === 'rain' ? 'lowpass' : 'highpass';
    filter.frequency.value = sound === 'rain' ? 950 : 1200;
    source.connect(filter);
    filter.connect(gainNode);
    source.start();
    return {
        stop: () => source.stop(),
    };
};

export function AmbiencePanel() {
    const [activeSound, setActiveSound] = useState<AmbienceId>('rain');
    const [volume, setVolume] = useState(60);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const contextRef = useRef<AudioContext | null>(null);
    const gainRef = useRef<GainNode | null>(null);
    const engineRef = useRef<EngineHandle | null>(null);

    const sounds: Array<{ id: AmbienceId; icon: typeof Volume2; label: string }> = [
        { id: 'whitenoise', icon: Volume2, label: 'White Noise' },
        { id: 'rain', icon: Droplets, label: 'Rain' },
        { id: 'music', icon: Headphones, label: 'Music' },
    ];

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setIsSupported(Boolean(window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext));
    }, []);

    useEffect(() => {
        if (!gainRef.current) return;
        gainRef.current.gain.value = volume / 100;
    }, [volume]);

    useEffect(() => {
        if (!isPlaying) return;

        const restartEngine = async () => {
            engineRef.current?.stop();
            if (!contextRef.current) {
                contextRef.current = getAudioContext();
            }
            const context = contextRef.current;
            if (!context) return;

            if (!gainRef.current) {
                gainRef.current = context.createGain();
                gainRef.current.gain.value = volume / 100;
                gainRef.current.connect(context.destination);
            }

            engineRef.current = await buildEngine(activeSound, gainRef.current, contextRef);
        };

        void restartEngine();
    }, [activeSound, isPlaying, volume]);

    const stopPlayback = () => {
        engineRef.current?.stop();
        engineRef.current = null;
        setIsPlaying(false);
    };

    const startPlayback = async () => {
        if (!isSupported) return;

        if (!contextRef.current) {
            contextRef.current = getAudioContext();
        }
        const context = contextRef.current;
        if (!context) {
            setIsSupported(false);
            return;
        }

        if (!gainRef.current) {
            gainRef.current = context.createGain();
            gainRef.current.connect(context.destination);
        }
        gainRef.current.gain.value = volume / 100;

        engineRef.current?.stop();
        engineRef.current = await buildEngine(activeSound, gainRef.current, contextRef);
        setIsPlaying(Boolean(engineRef.current));
    };

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 w-56">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
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

            <div className="mb-4 flex items-center gap-2">
                <button
                    onClick={isPlaying ? stopPlayback : () => { void startPlayback(); }}
                    className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/10 px-2 py-1 text-xs text-slate-200 hover:bg-white/20"
                    disabled={!isSupported}
                >
                    {isPlaying ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {isPlaying ? 'Stop' : 'Play'}
                </button>
                {!isSupported && (
                    <span className="text-[10px] text-amber-300">Audio not supported</span>
                )}
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
