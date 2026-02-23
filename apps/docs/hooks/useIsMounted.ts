import { useEffect, useState } from 'react';

/**
 * Returns true after the component has mounted in the browser.
 * Use this only when you genuinely need to suppress a hydration mismatch
 * (e.g. locale-sensitive date formatting). Do NOT use it to defer RTK
 * Query fetches — components under "use client" are never server-rendered
 * so the skip is wasteful.
 */
export function useIsMounted(): boolean {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    return mounted;
}
