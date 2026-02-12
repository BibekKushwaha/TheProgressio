import type { ZodError } from "zod";

type IssueLike = {
    path: PropertyKey[];
    message: string;
};

export type FormErrors<T extends string = string> = Partial<Record<T, string>>;

function toFieldKey(issue: IssueLike): string | null {
    const [head] = issue.path;
    return typeof head === "string" && head.trim() ? head : null;
}

export function zodIssuesToFormErrors<T extends string = string>(
    issues: ReadonlyArray<IssueLike>,
): FormErrors<T> {
    const errors: FormErrors<T> = {};

    for (const issue of issues) {
        const field = toFieldKey(issue);
        if (!field || !issue.message) continue;
        if (errors[field as T]) continue;
        errors[field as T] = issue.message;
    }

    return errors;
}

export function zodErrorToFormErrors<T extends string = string>(error: ZodError): FormErrors<T> {
    return zodIssuesToFormErrors<T>(error.issues);
}

export function firstZodIssueMessage(error: ZodError, fallback = "Invalid input"): string {
    const firstIssue = error.issues[0];
    if (!firstIssue?.message) return fallback;
    return firstIssue.message;
}
