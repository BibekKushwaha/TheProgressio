import type { ResolvedRotation } from '@repo/store';

interface RotationMatchParams {
    rotationFilter: boolean;
    rotation?: ResolvedRotation;
    itemRotation?: string | null;
}

export function matchesRotationFilter({
    rotationFilter,
    rotation,
    itemRotation,
}: RotationMatchParams): boolean {
    if (!rotationFilter || !rotation) return true;
    if (!itemRotation) return true;
    return itemRotation === rotation.rotation;
}
