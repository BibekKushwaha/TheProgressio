import { cookies } from "next/headers";
import { cache } from "react";
import { HabitsDashboardClient } from "./HabitsDashboardClient";
import type { BootstrapCritical, DashboardBootstrap } from "@repo/store";

/**
 * HabitsPage — async RSC with React streaming.
 *
 * Two fetches are started simultaneously server-side:
 *
 *   1. prefetchCritical  — GET /bootstrap/critical (habits + XP only, ~50ms)
 *      Awaited. Its data serialises into the initial HTML chunk so habit cards
 *      and the XP level card paint on first byte.
 *
 *   2. prefetchFull      — GET /bootstrap (habits + XP + heatmap + nudges, ~150ms)
 *      NOT awaited. The Promise is passed to the client as a prop.
 *      HabitsDashboardClient calls use(secondaryPromise) inside a <Suspense>
 *      boundary.  The heatmap + nudge panels stream in when the server resolves
 *      the full fetch — before the client has even loaded the JS bundle.
 *
 * Cache strategy:
 *   •  next: { revalidate: 30 }  — Next.js Data Cache revalidates every 30 s.
 *   •  React cache()             — deduplicates identical calls within one render.
 *   •  Redis (backend)           — XP cached 5 min, heatmap cached 12 h; both
 *                                  are invalidated on the next habit log.
 *
 * Never reveals tokens to the browser — cookies are forwarded server-to-server.
 */

const HABIT_SERVICE_URL =
    process.env.HABIT_SERVICE_URL ??
    process.env.NEXT_PUBLIC_HABIT_SERVICE_URL ??
    "http://localhost:4002";

// React cache() deduplicates within a single render tree — if multiple RSC
// components call prefetchFull with the same token, only one HTTP request fires.

/**
 * Critical path: habits + XP only.
 * 4 s timeout — if the service doesn't respond in time the page falls back to
 * a client-side RTK Query fetch instead of blocking the RSC stream.
 */
const prefetchCritical = cache(async (token: string): Promise<BootstrapCritical | null> => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 4_000);
    try {
        const res = await fetch(`${HABIT_SERVICE_URL}/api/habits/bootstrap/critical`, {
            headers: { Cookie: `token=${token}` },
            next: { revalidate: 30 },
            signal: ac.signal,
        });
        if (!res.ok) return null;
        return res.json() as Promise<BootstrapCritical>;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
});

/**
 * Full bootstrap: habits + XP + heatmap + nudges.
 * 8 s timeout — heatmap can be cold on first render; still safer than hanging
 * indefinitely and starving other concurrent RSC requests.
 */
const prefetchFull = cache(async (token: string): Promise<DashboardBootstrap | null> => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 8_000);
    try {
        const res = await fetch(`${HABIT_SERVICE_URL}/api/habits/bootstrap`, {
            headers: { Cookie: `token=${token}` },
            next: { revalidate: 30 },
            signal: ac.signal,
        });
        if (!res.ok) return null;
        return res.json() as Promise<DashboardBootstrap>;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
});

export default async function HabitsPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
        // Unauthenticated — client middleware will redirect to /login.
        // Return an empty coordinator so the client can handle auth state.
        return <HabitsDashboardClient criticalData={null} secondaryPromise={Promise.resolve(null)} />;
    }

    // Start both fetches at the same time — they race against each other.
    // Only critical is awaited so the response stream can start immediately.
    const criticalFetch = prefetchCritical(token);
    const fullFetch = prefetchFull(token); // NOT awaited — streamed in via Suspense

    const criticalData = await criticalFetch;

    return (
        <HabitsDashboardClient
            criticalData={criticalData}
            secondaryPromise={fullFetch}
        />
    );
}

