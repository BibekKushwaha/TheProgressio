import { useRef, useEffect } from 'react';
import { TimeSlot } from './TimeSlot';
import { EventCard } from './EventCard';
import { useGetCalendarDailyScheduleQuery } from '@repo/store';
import { toLocalDateKey } from '@/lib/date';
import { mapCalendarScheduleItems } from '@/lib/schedule';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DayGridProps {
    date: Date;
}

export function DayGrid({ date }: DayGridProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const dateString = toLocalDateKey(date);
    const { data: schedule, isLoading, error } = useGetCalendarDailyScheduleQuery({ date: dateString });

    // 1440px total height / 24 hours = 60px per hour. Scroll to 8 AM on mount.
    const SLOT_HEIGHT_PX = 60;
    const GRID_TOP_PADDING_PX = 16;
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 8 * SLOT_HEIGHT_PX;
        }
    }, [isLoading]); // Re-run when loading finishes so the loaded grid jumps correctly.

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
                    <div className="text-xs text-slate-500 mt-0.5">All schedule items</div>
                </div>
                <div className="text-sm text-slate-400 text-right">
                    {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto relative custom-scrollbar" ref={scrollRef}>
                <div className="absolute top-0 left-0 w-16 h-full border-r border-white/5 bg-black/20 z-10" />

                {/* Loading State Overlay */}
                {isLoading && (
                    <div className="absolute inset-0 z-30 bg-[#1C1C21]/50 backdrop-blur-sm flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 bg-[#1C1C21] p-6 rounded-2xl border border-white/10 shadow-2xl">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            <p className="text-sm font-medium text-white">Loading daily schedule...</p>
                        </div>
                    </div>
                )}

                {/* Error State Overlay */}
                {error && (
                    <div className="absolute inset-0 z-30 bg-[#1C1C21]/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="flex flex-col items-center text-center gap-3 bg-[#1C1C21] p-6 rounded-2xl border border-red-500/20 shadow-2xl max-w-sm">
                            <AlertTriangle className="w-10 h-10 text-red-500 mb-1" />
                            <h3 className="text-white font-medium">Failed to load schedule</h3>
                            <p className="text-slate-400 text-sm">
                                There was a problem reaching the calendar service. Please try reloading the page.
                            </p>
                        </div>
                    </div>
                )}

                {/* Time slots background */}
                <div
                    className="relative pt-4"
                    style={{ minHeight: `${24 * SLOT_HEIGHT_PX + GRID_TOP_PADDING_PX}px` }}
                >
                    {hours.map((hour) => (
                        <TimeSlot key={hour} time={`${hour.toString().padStart(2, '0')}:00`} />
                    ))}

                    {/* Events */}
                    {!isLoading && !error && mapCalendarScheduleItems(schedule?.items)
                        .map((item) => {
                            // Calculate position 
                            const [startHourStr = '0', startMinStr = '0'] = item.startTime.split(':');
                            const startHour = Number(startHourStr) || 0;
                            const startMin = Number(startMinStr) || 0;

                            const [endHourStr = '0', endMinStr = '0'] = item.endTime.split(':');
                            const endHour = Number(endHourStr) || 0;
                            const endMin = Number(endMinStr) || 0;

                            const startMinutes = startHour * 60 + startMin;
                            const endMinutes = endHour * 60 + endMin;
                            const duration = Math.max(endMinutes - startMinutes, 0);
                            const renderedHeight = Math.max(duration, 40);

                            // Resolve generic fields from specific mapped types
                            let subject = 'General';
                            let room = '';
                            if (item.kind === 'class') {
                                subject = item.subject;
                                room = item.room || '';
                            } else if (item.kind === 'exam') {
                                subject = item.subject || 'Exam';
                                room = item.location || '';
                            } else if (item.kind === 'task') {
                                subject = item.category || 'Task';
                                room = item.subtitle || '';
                            }

                            return (
                                <div
                                    key={item.id}
                                    className="absolute left-20 right-4 z-20"
                                    style={{
                                        top: `${startMinutes + GRID_TOP_PADDING_PX}px`,
                                        height: `${duration}px`,
                                        minHeight: '40px'
                                    }}
                                >
                                    <EventCard
                                        compact={renderedHeight <= 72}
                                        event={{
                                            title: item.title,
                                            subject: subject,
                                            room: room,
                                            color: item.color,
                                            hasQuiz: item.kind === 'exam',
                                            hasTask: item.kind === 'task'
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
