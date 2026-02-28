import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
    return (
        <div className="space-y-8 p-6 max-w-2xl">
            {/* Page title */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-40 bg-white/5" />
                <Skeleton className="h-4 w-64 bg-white/5" />
            </div>

            {/* Profile section */}
            <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
                <Skeleton className="h-5 w-28 bg-white/5" />
                <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full bg-white/5" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32 bg-white/5" />
                        <Skeleton className="h-4 w-48 bg-white/5" />
                    </div>
                </div>
                <div className="space-y-3 pt-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-1">
                            <Skeleton className="h-3 w-20 bg-white/5" />
                            <Skeleton className="h-9 w-full rounded-md bg-white/5" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Toggle rows */}
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-6">
                <Skeleton className="h-5 w-36 bg-white/5" />
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                        <div className="space-y-1">
                            <Skeleton className="h-4 w-40 bg-white/5" />
                            <Skeleton className="h-3 w-56 bg-white/5" />
                        </div>
                        <Skeleton className="h-6 w-11 rounded-full bg-white/5" />
                    </div>
                ))}
            </div>
        </div>
    );
}
