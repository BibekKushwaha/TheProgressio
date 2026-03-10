export const normalizeWarnings = (warnings: string[] | undefined): string[] => {
    if (!warnings || warnings.length === 0) return [];
    const deduped = new Set<string>();
    for (const warning of warnings) {
        const next = warning.trim();
        if (!next) continue;
        deduped.add(next);
    }
    return Array.from(deduped);
};
