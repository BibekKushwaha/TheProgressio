import { Skeleton } from "@/components/ui/skeleton";

export default function AchievementLoading() {
    return (
        <div className="space-y-8 p-6">
            {/* Page title */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-44 bg-white/5" />
                <Skeleton className="h-4 w-64 bg-white/5" />
            </div>

            {/* XP / level banner */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-3">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full bg-white/5" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-32 bg-white/5" />
                        <Skeleton className="h-3 w-full rounded-full bg-white/5" />
                        <Skeleton className="h-3 w-24 bg-white/5" />
                    </div>
                </div>
            </div>

            {/* Badges grid */}
            <div className="space-y-3">
                <Skeleton className="h-5 w-24 bg-white/5" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 15 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4">
                            <Skeleton className="h-12 w-12 rounded-full bg-white/5" />
                            <Skeleton className="h-3 w-16 bg-white/5" />
                            <Skeleton className="h-3 w-12 bg-white/5" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
