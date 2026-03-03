'use client';

import { useParams } from 'next/navigation';

export function useTaskRouteId(): string | undefined {
    const params = useParams();
    const rawId = params?.id;
    if (typeof rawId === 'string' && rawId.length > 0) return rawId;
    if (Array.isArray(rawId) && rawId.length > 0) return rawId[0];
    return undefined;
}