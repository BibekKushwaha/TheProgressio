import { describe, expect, it } from 'vitest';
import { matchSubject, normalizeSubjectName } from '@/lib/subjectMatcher';

const subjects = [
    { id: 'sub-1', name: 'Mathematics', color: '#3B82F6' },
    { id: 'sub-2', name: 'Math', color: '#14B8A6' },
    { id: 'sub-3', name: 'History', color: '#F97316' },
];

describe('subjectMatcher', () => {
    it('normalizes common subject aliases before scoring', () => {
        expect(normalizeSubjectName('Mathematics')).toBe('math');
        expect(normalizeSubjectName('Maths')).toBe('math');
        expect(normalizeSubjectName('PHYSICS')).toBe('phys');
    });

    it('returns ambiguous match options when normalized aliases collide', () => {
        const result = matchSubject('Maths', subjects);

        expect(result.type).toBe('ambiguous');
        if (result.type === 'ambiguous') {
            expect(result.options.map((option) => option.subject.name)).toEqual(
                expect.arrayContaining(['Mathematics', 'Math'])
            );
            expect(result.options[0]?.score).toBeLessThanOrEqual(result.options[1]?.score ?? Number.POSITIVE_INFINITY);
        }
    });

    it('returns new subject when no close subject exists', () => {
        const result = matchSubject('Economics', subjects);

        expect(result.type).toBe('new');
        if (result.type === 'new') {
            expect(result.name).toBe('Economics');
        }
    });
});
