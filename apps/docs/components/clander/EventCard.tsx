// components/calendar/EventCard.tsx
interface Event {
    subject: string;
    room: string;
    title: string;
    topic?: string;
    avatars?: string[];
    color: string;
    hasQuiz?: boolean;
    hasTask?: boolean;
}

interface EventCardProps {
    event: Event;
}

const colorStyles: Record<string, { border: string; bg: string; badge: string }> = {
    teal: {
        border: 'border-l-teal-500',
        bg: 'from-teal-900/20 to-teal-800/10',
        badge: 'bg-teal-500/20 text-teal-400',
    },
    orange: {
        border: 'border-l-orange-500',
        bg: 'from-orange-900/20 to-orange-800/10',
        badge: 'bg-orange-500/20 text-orange-400',
    },
    purple: {
        border: 'border-l-purple-500',
        bg: 'from-purple-900/20 to-purple-800/10',
        badge: 'bg-purple-500/20 text-purple-400',
    },
};

export function EventCard({ event }: EventCardProps) {
    const styles = colorStyles[event.color];

    return (
        <div className="relative h-full mr-4">
            {event.hasQuiz && (
                <div className="absolute -top-2 right-4 px-3 py-1 bg-red-600 rounded-full text-xs font-bold z-10">
                    QUIZ TODAY
                </div>
            )}

            <div
                className={`h-full bg-gradient-to-br ${styles?.bg} backdrop-blur-md border-l-4 ${styles?.border} border border-white/10 rounded-xl p-4 hover:shadow-xl hover:shadow-${event.color}-500/10 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer`}
            >
                <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 ${styles?.badge} rounded text-xs font-bold`}>
                        {event.subject}
                    </span>
                    <span className="text-xs text-slate-400">• {event.room}</span>
                </div>

                <h3 className="text-lg font-bold mb-1">{event.title}</h3>

                {event.topic && (
                    <p className="text-sm text-slate-400 mb-3">{event.topic}</p>
                )}

                {event.avatars && (
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                            {event.avatars.map((avatar, i) => (
                                <div
                                    key={i}
                                    className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-xs font-bold"
                                >
                                    {String.fromCharCode(65 + i)}
                                </div>
                            ))}
                        </div>
                        <span className="text-xs text-slate-400">+12 others</span>
                    </div>
                )}
            </div>
        </div>
    );
}