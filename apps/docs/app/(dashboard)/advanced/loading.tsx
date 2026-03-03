import { Skeleton } from "@/components/ui/skeleton";

export default function AdvancedLoading() {
    return (
        <div className="space-y-7">
            {/* Hero banner */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 space-y-4">
                <Skeleton className="h-5 w-40 rounded-full bg-white/5" />
                <Skeleton className="h-9 w-3/4 bg-white/5" />
                <Skeleton className="h-4 w-1/2 bg-white/5" />
            </div>

            {/* Tab list */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-11 rounded-xl bg-white/5" />
                ))}
            </div>

            {/* Active tab content placeholder */}
            <Skeleton className="h-64 w-full rounded-2xl bg-white/5" />

            {/* Bottom info cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-2xl bg-white/5" />
                ))}
            </div>
        </div>
    );
}
