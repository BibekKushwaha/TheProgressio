'use client';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export function StepOne() {
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([
        { text: 'Remind me to review thermodynamics tomorrow at 9am...', isUser: true, time: '9:41 AM' },
        { text: '✅ Task created! Thermodynamics review — Tomorrow 9:00 AM', isUser: false, time: '9:41 AM', sender: 'TheProgressio' }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = () => {
        if (!inputValue.trim()) return;

        const newMsg = { text: inputValue, isUser: true, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        setMessages(prev => [...prev, newMsg]);
        setInputValue('');

        // Simulate AI Response
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            const aiReply = {
                text: `Got it! I've added "${inputValue}" to your priority list. 🚀`,
                isUser: false,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                sender: 'TheProgressio'
            };
            setMessages(prev => [...prev, aiReply]);
        }, 1500);
    };

    return (
        <section className="relative py-24 overflow-hidden">
            {/* Radial glow */}
            <div className="absolute -left-40 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-blue-800/20 blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* LEFT — Text Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    >
                        <span className="inline-block text-xs font-bold tracking-[0.25em] uppercase text-sky-400 mb-4">
                            Step 01
                        </span>
                        <h3 className="text-4xl font-extrabold text-white mb-5 leading-tight">
                            Frictionless Capture
                        </h3>
                        <p className="text-slate-400 text-lg leading-relaxed mb-8">
                            WhatsApp Bot &amp; NLP Command Bar. Record tasks via voice or text in any language. Our AI handles the organization so you never lose a thought.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/25 text-green-400 text-sm font-semibold">
                                <span className="w-2 h-2 rounded-full bg-green-400" />
                                WhatsApp Sync
                            </span>
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-300 text-sm font-semibold">
                                <span className="text-sky-400">✦</span>
                                NLP Input Bar
                            </span>
                        </div>
                    </motion.div>

                    {/* RIGHT — Mock Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                    >
                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-2xl h-[400px] flex flex-col">
                            {/* Card header */}
                            <div className="flex items-center gap-2 mb-5 shrink-0">
                                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                                <div className="w-3 h-3 rounded-full bg-green-500/70" />
                                <span className="ml-auto text-xs text-slate-500 font-medium">WhatsApp Sync</span>
                            </div>

                            {/* Chat bubbles */}
                            <div ref={scrollRef} className="flex-1 space-y-3 mb-6 overflow-y-auto pr-2 custom-scrollbar">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.isUser ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.isUser ? 'bg-slate-700/60 rounded-tl-sm' : 'bg-sky-600/70 rounded-tr-sm'}`}>
                                            <p className="text-sm text-slate-100">{msg.text}</p>
                                            <span className={`text-[10px] mt-1 block ${msg.isUser ? 'text-slate-400' : 'text-sky-200 text-right'}`}>
                                                {msg.sender ? `${msg.sender} · ` : ''}{msg.time}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex justify-end">
                                        <div className="bg-sky-600/30 rounded-2xl rounded-tr-sm px-4 py-3 flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" />
                                            <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                            <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input row */}
                            <div className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-4 py-3 border border-white/5 shrink-0 hover:border-sky-500/30 transition-colors">
                                <input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Type a task or voice note..."
                                    className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={isTyping || !inputValue.trim()}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-all active:scale-95"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
