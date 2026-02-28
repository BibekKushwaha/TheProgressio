'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';

export function useTaskRouteId() {
    const params = useParams();

    return useMemo(() => {
        const rawId = params?.id;
        if (typeof rawId === 'string' && rawId.length > 0) return rawId;
        if (Array.isArray(rawId) && rawId.length > 0) return rawId[0];
        return undefined;
    }, [params]);
}