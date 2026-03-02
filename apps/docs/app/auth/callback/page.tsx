"use client";

/**
 * /auth/callback
 *
 * Landing page for OAuth (and any future SSO) redirects.
 *
 * The auth service sets the session cookies, then redirects here.
 *
 * IMPORTANT: we use window.location.href (hard navigation) instead of
 * router.replace (client-side navigation) so that the entire React/Redux
 * tree is re-mounted AFTER auth:hasSession is already in localStorage.
 *
 * With a soft navigation, AuthHydrator stays mounted from the previous
 * render cycle and its localStorage-check effect (dependency: [isAuthenticated])
 * never re-fires — it already ran when auth:hasSession was absent, so it
 * skips the profile fetch and AuthGuard gets stuck on "Verifying session"
 * forever. A full page reload guarantees AuthHydrator reads the flag on its
 * very first mount.
 */

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AUTH_SESSION_KEY } from "@/constant";
import { PageLoader } from "@/components/layout/PageLoader";

function isSafeNext(path: string | null): path is string {
  if (!path) return false;
  return path.startsWith("/") && !path.startsWith("//");
}

function OAuthCallbackInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    try {
      localStorage.setItem(AUTH_SESSION_KEY, "1");
    } catch {
      // Private-browsing / storage quota — proceed anyway.
    }

    const next = searchParams.get("next");
    const destination = isSafeNext(next) ? next : "/dashboard";

    // Hard navigation so the full app re-mounts and AuthHydrator sees the
    // localStorage flag on its first render rather than missing it.
    window.location.href = destination;
  }, [searchParams]);

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
