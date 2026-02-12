// components/create-task/VoiceInput.tsx
'use client';

import { Mic } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast-provider';

interface VoiceInputProps {
    onResult: (text: string) => void;
    isCompact?: boolean;
}

interface SpeechRecognitionResultLike {
    [index: number]: {
        transcript: string;
    };
}

interface SpeechRecognitionEventLike {
    results: {
        [index: number]: SpeechRecognitionResultLike;
    };
}

interface SpeechRecognitionErrorEventLike {
    error: string;
}

interface SpeechRecognitionInstance {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface WindowWithSpeechRecognition extends Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export function VoiceInput({ onResult, isCompact }: VoiceInputProps) {
    const [isActive, setIsActive] = useState(false);
    const [recognition, setRecognition] = useState<SpeechRecognitionInstance | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const speechWindow = window as WindowWithSpeechRecognition;
            const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognitionInstance = new SpeechRecognition();
                recognitionInstance.continuous = false;
                recognitionInstance.interimResults = false;
                recognitionInstance.lang = 'en-US';

                recognitionInstance.onresult = (event: SpeechRecognitionEventLike) => {
                    const transcript = event.results[0]?.[0]?.transcript;
                    if (!transcript) {
                        setIsActive(false);
                        return;
                    }
                    onResult(transcript);
                    toast('🎤 Voice captured!', 'success');
                    if (window.navigator?.vibrate) window.navigator.vibrate(200);
                    setIsActive(false);
                };

                recognitionInstance.onerror = (event: SpeechRecognitionErrorEventLike) => {
                    console.error('Speech recognition error', event.error);
                    setIsActive(false);
                };

                recognitionInstance.onend = () => {
                    setIsActive(false);
                }

                setRecognition(recognitionInstance);
            }
        }
    }, [onResult, toast]);

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
