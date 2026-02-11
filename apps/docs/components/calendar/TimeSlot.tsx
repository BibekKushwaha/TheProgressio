// components/calendar/TimeSlot.tsx
interface TimeSlotProps {
    time: string;
    index?: number;
}

export function TimeSlot({ time, index }: TimeSlotProps) {
    return (
        <div className="relative h-[60px] border-t border-slate-800/50" data-slot-index={index}>
            <span className="absolute -top-3 left-0 text-xs text-slate-500 font-medium">
                {time}
            </span>
        </div>
    );
}