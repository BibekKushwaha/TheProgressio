import { Skeleton } from "@/components/ui/skeleton";

export default function PlannerLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-28 rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
      </div>

      {/* NLP command bar */}
      <Skeleton className="h-14 rounded-2xl" />

      {/* Planner columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-8 rounded-xl" />
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-24 rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
