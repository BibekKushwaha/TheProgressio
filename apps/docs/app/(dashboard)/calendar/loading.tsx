import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
    return (
        <div className="space-y-6 p-6">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-32 bg-white/5" />
                    <Skeleton className="h-4 w-52 bg-white/5" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-9 rounded-md bg-white/5" />
                    <Skeleton className="h-9 w-28 rounded-md bg-white/5" />
                    <Skeleton className="h-9 w-9 rounded-md bg-white/5" />
                </div>
            </div>

            {/* Day-of-week labels */}
            <div className="grid grid-cols-7 gap-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d} className="text-center">
                        <Skeleton className="mx-auto h-4 w-8 bg-white/5" />
                    </div>
                ))}
            </div>

            {/* Month grid — 5 rows × 7 columns */}
            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg bg-white/5" />
                ))}
            </div>
        </div>
    );
}
