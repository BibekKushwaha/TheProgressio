"use client";

/**
 * HabitsDashboardClient — streaming coordinator for the habits page.
 *
 * Data flow:
 *
 *   RSC page.tsx
 *     ├─ await prefetchCritical()  ──→  criticalData prop (habits + XP)
 *     │                                 Serialised into initial HTML chunk.
 *     │                                 Habits list + XP level card paint
 *     │                                 before any client JS executes.
 *     │
 *     └─ prefetchFull()  ──────────→  secondaryPromise prop (full bootstrap)
 *                                      NOT awaited.  Passed as Promise<T> to
 *                                      SecondarySection which calls use() and
 *                                      suspends inside its own <Suspense>.
 *                                      Heatmap + nudges stream in once the
 *                                      server-side fetch resolves.
 *
 *   RTK useGetDashboardBootstrapQuery()
 *     Fires after client hydration.  Keeps data fresh on subsequent mutations
 *     (logHabit, reset, etc.) — invalidatesTags causes a refetch and the new
 *     xp / heatmap / nudge data flows back into the subtrees via props.
 *
 * Component hierarchy:
 *   HabitsDashboardClient
 *     <Suspense>   ← HabitsClient (useSearchParams needs boundary)
 *     <UserLevelCard>               ← critical XP prop, RTK wins on update
 *     <Suspense fallback=skeleton>  ← streams heatmap + nudges
 *       <SecondarySection use(secondaryPromise)>
 */

import { use, Suspense, useEffect, useState } from "react";
import {
    habitsApi,
    useAppDispatch,
    useGetDashboardBootstrapQuery,
    type BootstrapCritical,
    type DashboardBootstrap,
} from "@repo/store";
import { HabitsClient } from "./HabitsClient";
import { UserLevelCard } from "@/components/habit/UserLevelCard";
import { ContributionHeatmap } from "@/components/habit/ContributionHeatmap";
import { Skeleton } from "@/components/ui/skeleton";
import { useStreamingMemoryProfile } from "@/hooks/useStreamingMemoryProfile";

// ── Skeletons ───────────────────────────────────────────────────────────

function HabitsListSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-12 w-full rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <Skeleton
                        key={i}
                        className="h-64 rounded-2xl bg-white/5 border border-white/10"
                    />
                ))}
            </div>
        </div>
    );
}

function SecondarySkeletons() {
    return (
        <>
            <div className="mt-10 mb-8">
                <Skeleton className="h-44 rounded-2xl bg-white/5 border border-white/10" />
            </div>
            <div className="mb-8">
                <Skeleton className="h-64 rounded-2xl bg-white/5 border border-white/10" />
            </div>
        </>
    );
}

// ── Secondary content (heatmap + nudge pre-warm) ────────────────────────
// Calls use() on the server-started Promise.  Suspends until the full
// bootstrap resolves; Next.js streams the resolved content inline.

function SecondarySection({
    promise,
    rtkXP,
    rtkHeatmap,
    rtkSummary,
}: {
    promise: Promise<DashboardBootstrap | null>;
    rtkXP: DashboardBootstrap["xp"] | undefined;
    rtkHeatmap: DashboardBootstrap["heatmap"] | undefined;
    rtkSummary: DashboardBootstrap["heatmapSummary"] | undefined;
}) {
    // use() suspends until the Promise resolves.
    // After client hydration, RTK data takes over via prop updates.
    const serverData = use(promise);

    const xp = rtkXP ?? serverData?.xp;
    const heatmap = rtkHeatmap ?? serverData?.heatmap ?? [];
    const summary = rtkSummary ?? serverData?.heatmapSummary;

    return (
        <>
            <div className="mt-10 mb-8">
                <UserLevelCard serverXP={xp} />
            </div>
            <div className="mb-8">
                <ContributionHeatmap serverHeatmap={heatmap} serverSummary={summary} />
            </div>
        </>
    );
}

// ── Main coordinator ────────────────────────────────────────────────────

interface Props {
    /** Habits + XP pre-fetched and awaited server-side (fast, no heatmap). */
    criticalData: BootstrapCritical | null;
    /** Full bootstrap Promise — started server-side, NOT awaited.
     *  Resolved data streams into <SecondarySection> via React Suspense. */
    secondaryPromise: Promise<DashboardBootstrap | null>;
}

export function HabitsDashboardClient({ criticalData, secondaryPromise }: Props) {
    const dispatch = useAppDispatch();
    const [bootstrapSubscriptionEnabled, setBootstrapSubscriptionEnabled] = useState(!criticalData);

    useEffect(() => {
        let isActive = true;

        if (criticalData) {
            dispatch(
                habitsApi.util.upsertQueryData("getHabits", undefined, {
                    message: criticalData.message,
                    habits: criticalData.habits,
                })
            );
            dispatch(
                habitsApi.util.upsertQueryData("getUserXP", undefined, {
                    message: criticalData.message,
                    xp: criticalData.xp,
                })
            );
        }

        if (!criticalData) {
            setBootstrapSubscriptionEnabled(true);
            return () => {
                isActive = false;
            };
        }

        Promise.resolve(secondaryPromise)
            .then((fullData) => {
                if (!isActive || !fullData) {
                    return;
                }

                dispatch(
                    habitsApi.util.upsertQueryData("getDashboardBootstrap", undefined, fullData)
                );
                dispatch(
                    habitsApi.util.upsertQueryData("getContributionHeatmap", undefined, {
                        message: fullData.message,
                        heatmap: fullData.heatmap,
                        summary: fullData.heatmapSummary,
                    })
                );

                if (fullData.nudges) {
                    dispatch(
                        habitsApi.util.upsertQueryData("getNudges", undefined, {
                            message: fullData.message,
                            nudges: fullData.nudges,
                        })
                    );
                }
            })
            .finally(() => {
                if (isActive) {
                    setBootstrapSubscriptionEnabled(true);
                }
            });

        return () => {
            isActive = false;
        };
    }, [criticalData, dispatch, secondaryPromise]);

    // Client-side bootstrap query keeps data fresh after mutations.
    // Fires after hydration; onQueryStarted pre-warms individual RTK caches.
    const { data: rtkBootstrap } = useGetDashboardBootstrapQuery(undefined, {
        skip: !bootstrapSubscriptionEnabled,
    });

    // DEV-ONLY: profile JS heap usage while the secondary Suspense boundary
    // is in-flight (streaming heatmap + nudges from server).  No-op in prod.
    useStreamingMemoryProfile('HabitsDashboard/secondary', !rtkBootstrap);

    // After a mutation, RTK data wins; on first load, RSC critical data wins.
    const habits = rtkBootstrap?.habits ?? criticalData?.habits;
    const xp = rtkBootstrap?.xp ?? criticalData?.xp;

    return (
        <div className="space-y-6">
            {/*
             * HabitsClient uses useSearchParams() which requires a Suspense
             * boundary in the App Router.
             */}
            <Suspense fallback={<HabitsListSkeleton />}>
                <HabitsClient
                    serverHabits={habits}
                    serverHabitsLoading={false}
                />
            </Suspense>

            {/*
             * Secondary content (XP level card + heatmap) streams in via
             * React Streaming.  <Suspense> renders its fallback in the initial
             * HTML while the server resolves secondaryPromise, then seamlessly
             * replaces the skeleton with real content — all before any client
             * JS bundle has loaded.
             */}
            <Suspense fallback={<SecondarySkeletons />}>
                <SecondarySection
                    promise={secondaryPromise}
                    rtkXP={xp}
                    rtkHeatmap={rtkBootstrap?.heatmap}
                    rtkSummary={rtkBootstrap?.heatmapSummary}
                />
            </Suspense>
        </div>
    );
}

