import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

describe('cn (Tailwind class merge utility)', () => {
    it('returns a single class unchanged', () => {
        expect(cn('text-white')).toBe('text-white');
    });

    it('joins multiple classes with a space', () => {
        expect(cn('text-white', 'bg-black')).toBe('text-white bg-black');
    });

    it('deduplicates conflicting Tailwind classes (last wins)', () => {
        // twMerge should keep p-4 and discard p-2 when both are passed
        const result = cn('p-2', 'p-4');
        expect(result).toBe('p-4');
        expect(result).not.toContain('p-2');
    });

    it('filters out falsy values', () => {
        expect(cn('a', false, undefined, null, '', 'c')).toBe('a c');
    });

    it('handles conditional object syntax', () => {
        const result = cn({ 'font-bold': true, 'font-normal': false });
        expect(result).toBe('font-bold');
        expect(result).not.toContain('font-normal');
    });

    it('merges conflicting text colours — last supplied wins', () => {
        const result = cn('text-red-500', 'text-blue-500');
        expect(result).toBe('text-blue-500');
        expect(result).not.toContain('text-red-500');
    });

    it('returns empty string for no arguments', () => {
        expect(cn()).toBe('');
    });

    it('handles array inputs via clsx', () => {
        expect(cn(['a', 'b'], 'c')).toBe('a b c');
    });
});
