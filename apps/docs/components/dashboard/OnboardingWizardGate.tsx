'use client';

/**
 * OnboardingWizardGate
 *
 * Encapsulates the localStorage check + mounted guard so DashboardPage stays
 * free of any `useState`/`useEffect` that would delay its initial render.
 *
 * Behaviour:
 *  - On first client render: nothing is shown (avoids hydration mismatch).
 *  - After mount: reads `onboarding-completed` from localStorage.
 *  - If the key is absent the full `OnboardingWizard` is rendered.
 *  - Once the wizard calls `onComplete`, the key is written and the wizard
 *    unmounts cleanly without affecting the dashboard layout below it.
 */

import { useState, useEffect } from 'react';
import { OnboardingWizard } from '@/components/dashboard/OnboardingWizard';

export function OnboardingWizardGate() {
    // Start as null (unknown) so we never flash the wizard on an authenticated
    // returning user while waiting for the localStorage read.
    const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

    useEffect(() => {
        // localStorage is only available after mount — safe to read here.
        const completed = typeof window !== 'undefined'
            ? localStorage.getItem('onboarding-completed')
            : 'true'; // SSR fallback: never show wizard server-side
        setShowOnboarding(!completed);
    }, []);

    // null  = not yet mounted (render nothing to avoid layout shift)
    // false = completed (render nothing)
    // true  = first-time user (render the wizard overlay)
    if (!showOnboarding) return null;

    return (
        <OnboardingWizard
            onComplete={() => setShowOnboarding(false)}
        />
    );
}
