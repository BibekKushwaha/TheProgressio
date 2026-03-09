'use client';

// NOTE: 'use client' is required here only because DashboardLayoutProvider reads
// localStorage. The page itself does no localStorage reads — they are deferred
// into child components so the shell renders immediately without a mounted-gate
// causing a FOUC.

import { DashboardLayoutProvider } from '@/components/dashboard/DashboardLayoutContext';
import { ModifiableDashboard } from '@/components/dashboard/ModifiableDashboard';
import { OnboardingWizardGate } from '@/components/dashboard/OnboardingWizardGate';

export default function DashboardPage() {
    return (
        <DashboardLayoutProvider>
            {/* OnboardingWizardGate handles its own mount check and localStorage read
                internally so this page never blocks rendering on a mounted state */}
            <OnboardingWizardGate />
            <ModifiableDashboard />
        </DashboardLayoutProvider>
    );
}
