import { useRef, useEffect } from 'react';
import { TimeSlot } from './TimeSlot';
import { EventCard } from './EventCard';
import { useGetCalendarDailyScheduleQuery, ResolvedRotation } from '@repo/store';
import { toLocalDateKey } from '@/lib/date';
import { matchesRotationFilter } from '@/lib/rotation';

interface DayGridProps {
    date: Date;
    rotationFilter?: boolean;
    rotation?: ResolvedRotation;
}

export function DayGrid({ date, rotationFilter = false, rotation }: DayGridProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const dateString = toLocalDateKey(date);
    const { data: schedule } = useGetCalendarDailyScheduleQuery(
        { date: dateString },
        { refetchOnMountOrArgChange: true }
    );

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 480; // Scroll to 8 AM
        }
    }, []);

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-md border border-white/10 rounded-2xl h-[calc(100vh-12rem)] flex flex-col overflow-hidden">
            {schedule?.isHoliday && (
                <div className="p-3 border-b border-white/6 bg-yellow-500/5 text-yellow-200 text-sm">
                    <strong>{schedule.holidayName ?? 'Holiday'}</strong>
                    {schedule.pauseNotifications && <span className="ml-2">• Notifications paused</span>}
                </div>
            )}
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-white">Daily Schedule</h2>
                    <div className="text-xs text-slate-500 mt-0.5">
                        {rotationFilter ? 'Rotation filtered view' : 'All schedule items'}
                    </div>
                </div>
                <div className="text-sm text-slate-400 text-right">
                    {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto relative custom-scrollbar" ref={scrollRef}>
                <div className="absolute top-0 left-0 w-16 h-full border-r border-white/5 bg-black/20 z-10" />

                {/* Time slots background */}
                <div className="relative min-h-[1440px]">
                    {hours.map((hour) => (
                        <TimeSlot key={hour} time={`${hour.toString().padStart(2, '0')}:00`} />
                    ))}

                    {/* Events */}
                    {schedule?.items
                        .filter((it) =>
                            matchesRotationFilter({
                                rotationFilter,
                                rotation,
                                itemRotation: it.rotation,
                            })
                        )
                        .map((item) => {
                        // Calculate position
                        const [startHourStr, startMinStr] = item.startTime.split(':');
                        const startHour = Number(startHourStr) || 0;
                        const startMin = Number(startMinStr) || 0;

                        const [endHourStr, endMinStr] = item.endTime.split(':');
                        const endHour = Number(endHourStr) || 0;
                        const endMin = Number(endMinStr) || 0;

                        const startMinutes = startHour * 60 + startMin;
                        const endMinutes = endHour * 60 + endMin;
                        const duration = endMinutes - startMinutes;

                        return (
                            <div
                                key={item.id}
                                className="absolute left-20 right-4 z-20"
                                style={{
                                    top: `${startMinutes}px`,
                                    height: `${duration}px`,
                                    minHeight: '40px'
                                }}
                            >
                                <EventCard
                                    event={{
                                        title: item.title,
                                        subject: item.subject || item.category || 'General',
                                        room: item.subtitle || '',
                                        color: item.color || 'teal', // Default valid key
                                        // Add defaults for required fields
                                        hasQuiz: item.type === 'exam',
                                        hasTask: item.type === 'task'
                                    }}
                                />
                            </div>
                        );
                    })}

                </div>
            </div>
        </div>
    );
}
