// components/create-task/VoiceInput.tsx
'use client';

import { Mic } from 'lucide-react';
import { useState, useEffect } from 'react';

interface VoiceInputProps {
    onResult: (text: string) => void;
    isCompact?: boolean;
}

export function VoiceInput({ onResult, isCompact }: VoiceInputProps) {
    const [isActive, setIsActive] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognitionInstance = new SpeechRecognition();
                recognitionInstance.continuous = false;
                recognitionInstance.interimResults = false;
                recognitionInstance.lang = 'en-US';

                recognitionInstance.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    onResult(transcript);
                    setIsActive(false);
                };

                recognitionInstance.onerror = (event: any) => {
                    console.error('Speech recognition error', event.error);
                    setIsActive(false);
                };

                recognitionInstance.onend = () => {
                    setIsActive(false);
                }

                setRecognition(recognitionInstance);
            }
        }
    }, [onResult]);

    const toggleRecording = () => {
        if (!recognition) return;

        if (isActive) {
            recognition.stop();
            setIsActive(false);
        } else {
            recognition.start();
            setIsActive(true);
        }
    };

    if (isCompact) {
        return (
            <button
                onClick={toggleRecording}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${isActive
                    ? 'bg-red-500/20 text-red-500 scale-110 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                    : 'bg-white/5 text-purple-400 hover:bg-white/10 hover:text-purple-300'
                    }`}
                title={isActive ? 'Stop recording' : 'Start voice input'}
            >
                {isActive ? (
                    <div className="relative">
                        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25"></div>
                        <Mic className="w-5 h-5 relative animate-pulse" />
                    </div>
                ) : (
                    <Mic className="w-5 h-5" />
                )}
            </button>
        );
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <button
                onClick={toggleRecording}
                className={`relative w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-110 ${isActive ? 'shadow-purple-500/50 scale-110' : 'shadow-purple-500/30'
                    }`}
                aria-label="Voice input"
            >
                <div className={`absolute inset-0 bg-purple-500 rounded-full ${isActive ? 'animate-ping' : ''}`}></div>
                <Mic className={`relative w-8 h-8 ${isActive ? 'animate-pulse' : ''}`} />
            </button>
            <span className="text-sm text-slate-400 font-medium">
                {isActive ? 'Listening...' : 'Tap to Speak'}
            </span>
        </div>
    );
}