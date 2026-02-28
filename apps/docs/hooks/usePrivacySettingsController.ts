'use client';

import { useEffect, useState } from 'react';
import { isAIAssistanceDisabled, setAIAssistanceDisabled } from '@repo/store';
import { toast } from 'sonner';

export function usePrivacySettingsController() {
    const [aiDisabled, setAiDisabled] = useState(false);

    useEffect(() => {
        setAiDisabled(isAIAssistanceDisabled());
    }, []);

    const toggleAiAssistance = (checked: boolean) => {
        const nextDisabled = !checked;
        setAiDisabled(nextDisabled);
        setAIAssistanceDisabled(nextDisabled);
        toast.success(nextDisabled ? 'AI assistance disabled' : 'AI assistance enabled');
    };

    return {
        aiDisabled,
        toggleAiAssistance,
    };
}