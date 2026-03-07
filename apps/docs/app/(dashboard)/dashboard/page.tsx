'use client';

import { useState, useEffect } from 'react';
import { DashboardLayoutProvider } from '@/components/dashboard/DashboardLayoutContext';
import { ModifiableDashboard } from '@/components/dashboard/ModifiableDashboard';
import { OnboardingWizard } from '@/components/dashboard/OnboardingWizard';

export default function DashboardPage() {
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!localStorage.getItem('onboarding-completed')) {
            setShowOnboarding(true);
        }
    }, []);

    return (
        <DashboardLayoutProvider>
            {mounted && showOnboarding && (
                <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
            )}
            <ModifiableDashboard />
        </DashboardLayoutProvider>
    );
}

