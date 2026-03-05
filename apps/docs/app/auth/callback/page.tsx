"use client";

/**
 * /auth/callback
 *
 * Landing page for OAuth (and any future SSO) redirects.
 *
 * The auth service sets the session cookies, then redirects here.
 *
 * STRATEGY: Fetch the user profile using the freshly-issued cookies, then
 * dispatch hydrateAuth and do a soft (client-side) navigation.  Because Redux
 * state is preserved across client-side route changes, AuthGuard on the
 * destination page sees isAuthenticated=true immediately and never has to
 * wait for a second /me round-trip — eliminating the race condition where a
 * stale RTK Query error cache caused an immediate logout().
 *
 * FALLBACK: If the /me fetch fails (network down, service unavailable), we
 * fall back to the original hard-navigation approach so the full React/Redux
 * tree re-mounts and AuthHydrator gets a fresh start with the localStorage
 * hint in place.
 */

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppDispatch, hydrateAuth } from "@repo/store";
import { AUTH_SESSION_KEY } from "@/constant";
import { PageLoader } from "@/components/layout/PageLoader";

const AUTH_SERVICE_URL =
  process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ?? "http://localhost:4000";

function isSafeNext(path: string | null): path is string {
  if (!path) return false;
  return path.startsWith("/") && !path.startsWith("//");
}

function OAuthCallbackInner() {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => {
    const next = searchParams.get("next");
    const destination = isSafeNext(next) ? next : "/dashboard";

    const handleCallback = async () => {
      try {
        // Fetch the user profile using the cookies the auth service just set.
        // credentials:"include" ensures the httpOnly token cookie is sent.
        const res = await fetch(`${AUTH_SERVICE_URL}/api/auth/me`, {
          credentials: "include",
        });

        if (res.ok) {
          const data = (await res.json()) as { user?: unknown };
          if (data?.user) {
            // Hydrate Redux BEFORE navigating so AuthGuard sees
            // isAuthenticated=true on the very first render of the
            // destination page — no "Verifying session" flash.
            dispatch(hydrateAuth({ user: data.user as Parameters<typeof hydrateAuth>[0]["user"] }));
          }
        }
      } catch {
        // Network error — the fallback below handles it gracefully.
      }

      try {
        localStorage.setItem(AUTH_SESSION_KEY, "1");
      } catch {
        // Private-browsing / storage quota — proceed anyway.
      }

      // Soft navigation preserves Redux state (including the hydrated user).
      // AuthHydrator will see isAuthenticated=true and skip the redundant
      // /me fetch.  If the fetch above failed we still navigate; AuthHydrator
      // will retry via its own profile-fetch path on the destination page.
      router.replace(destination);
    };

    void handleCallback();
  }, [searchParams, dispatch, router]);

  return (
    <PageLoader
      title="Signing you in"
      subtitle="Finishing up your Google login…"
    />
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <PageLoader
          title="Signing you in"
          subtitle="Finishing up your Google login…"
        />
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  );
}
