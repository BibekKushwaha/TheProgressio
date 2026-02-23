export function toArray<T = any>(input: unknown, keys: string[] = []): T[] {
    if (Array.isArray(input)) {
        return input as T[];
    }

    if (input && typeof input === 'object') {
        const obj = input as Record<string, unknown>;
        for (const key of keys) {
            if (Array.isArray(obj[key])) {
                return obj[key] as T[];
            }
        }
    }

    return [];
}
