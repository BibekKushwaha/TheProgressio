import type { Subject } from "@repo/store";

export const AUTO_MATCH_THRESHOLD = 0.2;
export const CONFIRM_THRESHOLD = 0.4;

export type SubjectMatch =
    | { type: "auto"; subjectId: string; score: number }
    | { type: "ambiguous"; options: Array<{ subject: Subject; score: number }> }
    | { type: "new"; name: string };

const normalizeSpacing = (value: string) => value.replace(/\s+/g, " ").trim();

export const normalizeSubjectName = (name: string) =>
    normalizeSpacing(
        name
            .toLowerCase()
            .replace(/[^\w\s]/g, " ")
            .replace(/\bmathematics\b/g, "math")
            .replace(/\bmaths\b/g, "math")
            .replace(/\bphysics\b/g, "phys")
            .replace(/\bchemistry\b/g, "chem")
            .replace(/\bbiology\b/g, "bio")
    );

const levenshteinDistance = (source: string, target: string): number => {
    if (source === target) return 0;
    if (!source.length) return target.length;
    if (!target.length) return source.length;

    const matrix = Array.from({ length: source.length + 1 }, (_, row) =>
        Array.from({ length: target.length + 1 }, (_, column) => (row === 0 ? column : column === 0 ? row : 0))
    );

    for (let row = 1; row <= source.length; row += 1) {
        for (let column = 1; column <= target.length; column += 1) {
            const cost = source[row - 1] === target[column - 1] ? 0 : 1;
            matrix[row]![column] = Math.min(
                matrix[row - 1]![column]! + 1,
                matrix[row]![column - 1]! + 1,
                matrix[row - 1]![column - 1]! + cost,
            );
        }
    }

    return matrix[source.length]![target.length]!;
};

export const getSubjectSimilarityScore = (source: string, target: string) => {
    const left = normalizeSubjectName(source);
    const right = normalizeSubjectName(target);
    if (!left || !right) return Number.POSITIVE_INFINITY;
    if (left === right) return 0;
    const distance = levenshteinDistance(left, right);
    return distance / Math.max(left.length, right.length, 1);
};

export const getSubjectSuggestions = (name: string, subjects: Subject[]) =>
    [...subjects]
        .map((subject) => ({
            subject,
            score: getSubjectSimilarityScore(name, subject.name),
        }))
        .filter((item) => Number.isFinite(item.score))
        .sort((left, right) => {
            if (left.score !== right.score) return left.score - right.score;
            return left.subject.name.localeCompare(right.subject.name);
        })
        .slice(0, 3);

export const matchSubject = (name: string, subjects: Subject[]): SubjectMatch => {
    const suggestions = getSubjectSuggestions(name, subjects);
    const bestMatch = suggestions[0];
    if (!bestMatch) {
        return { type: "new", name: name.trim() };
    }

    const ambiguousNearTies = suggestions.filter(
        (item) => item.score <= AUTO_MATCH_THRESHOLD && Math.abs(item.score - bestMatch.score) <= 0.05,
    );

    if (bestMatch.score <= AUTO_MATCH_THRESHOLD) {
        if (ambiguousNearTies.length > 1) {
            return { type: "ambiguous", options: ambiguousNearTies };
        }
        return { type: "auto", subjectId: bestMatch.subject.id, score: bestMatch.score };
    }

    if (bestMatch.score <= CONFIRM_THRESHOLD) {
        return { type: "ambiguous", options: suggestions };
    }

    return { type: "new", name: name.trim() };
};
