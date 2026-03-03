import { Skeleton } from "@/components/ui/skeleton";

export default function PlannerLoading() {
  return (
    <div className="flex-1 flex flex-col py-4">
      {/* Header — title + stats row */}
      <div className="pb-4 border-b border-white/10 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-5 w-80 rounded-lg" />
        </div>
        {/* Quick stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Recovery panel */}
      <div className="flex-1 mt-6">
        <Skeleton className="h-[480px] rounded-xl" />
      </div>
    </div>
  );
}
