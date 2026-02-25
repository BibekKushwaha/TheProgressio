import { useState, useEffect } from 'react';

/**
 * Returns true when the browser tab is visible, false when hidden.
 * Useful for pausing pollingInterval when the user cannot see the page.
 */
export function usePageVisibility(): boolean {
    const [isVisible, setIsVisible] = useState<boolean>(() =>
        typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
    );

    useEffect(() => {
        const handler = () => {
            setIsVisible(document.visibilityState === 'visible');
        };
        document.addEventListener('visibilitychange', handler);
        return () => document.removeEventListener('visibilitychange', handler);
    }, []);

    return isVisible;
}
