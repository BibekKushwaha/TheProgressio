
import { prisma, type Prisma } from "@repo/db";

const MINUTES_PER_DAY = 24 * 60;

export interface ScheduleConflict {
    id: string;
    type: "CLASS_OVERLAP" | "EXAM_OVERLAP";
    severity: "warning" | "high";
    message: string;
    startsAt: string;
    endsAt: string;
    classEntryIds?: string[];
    examId?: string;
}

type TimetableEntryWithSubject = Prisma.TimetableGetPayload<{
    include: { subject: true };
}>;

export interface DailyScheduleResult {
    date: string;
    dayOfWeek: number;
    rotation: string;
    isHoliday: boolean;
    holidayName: string | null;
    pauseNotifications: boolean;
    conflicts: ScheduleConflict[];
    entries: TimetableEntryWithSubject[];
}

export interface ParsedTimetableEntryDraft {
    subjectName: string;
    dayOfWeek: number | null;
    startTime: string | null;
    endTime: string | null;
    rotation: string | null;
    confidence: number;
    sourceLine?: string | undefined;
    warnings?: string[];
}

export interface TimetableImportPreviewResult {
    entries: ParsedTimetableEntryDraft[];
    warnings: string[];
    parser: {
        deterministicMatches: number;
        aiMatches: number;
        normalizedLines: number;
    };
}

const DAY_LOOKUP: Array<{ value: number; aliases: string[] }> = [
    { value: 0, aliases: ["sun", "sunday"] },
    { value: 1, aliases: ["mon", "monday"] },
    { value: 2, aliases: ["tue", "tues", "tuesday"] },
    { value: 3, aliases: ["wed", "wednesday"] },
    { value: 4, aliases: ["thu", "thur", "thurs", "thursday"] },
    { value: 5, aliases: ["fri", "friday"] },
    { value: 6, aliases: ["sat", "saturday"] },
];

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

const normalizeOcrDayToken = (value: string): string =>
    value
        .replace(/0/g, "o")
        .replace(/1/g, "i")
        .replace(/5/g, "s");

const normalizeOcrTimeToken = (value: string): string =>
    value
        .replace(/[oO]/g, "0")
        .replace(/[iIl]/g, "1");

const normalizeRotation = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const cleaned = normalizeWhitespace(value).replace(/^rotation\s+/i, "");
    return cleaned.length > 0 ? cleaned.toUpperCase() : null;
};

const resolveDayOfWeek = (raw: string): number | null => {
    const normalized = normalizeWhitespace(normalizeOcrDayToken(raw)).toLowerCase();
    if (!normalized) return null;
    const direct = DAY_LOOKUP.find((item) => item.aliases.includes(normalized));
    if (direct) return direct.value;
    const partial = DAY_LOOKUP.find((item) => item.aliases.some((alias) => normalized.includes(alias)));
    return partial?.value ?? null;
};

const normalizeTimeToken = (raw: string): string | null => {
    const normalized = normalizeWhitespace(normalizeOcrTimeToken(raw))
        .toLowerCase()
        .replace(/\./g, ":");
    if (!normalized) return null;

    const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!match) return null;

    let hours = Number.parseInt(match[1] ?? "", 10);
    const minutes = Number.parseInt(match[2] ?? "0", 10);
    const meridiem = match[3]?.toLowerCase();

    if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes < 0 || minutes > 59) {
        return null;
    }

    if (meridiem) {
        if (hours < 1 || hours > 12) return null;
        if (meridiem === "pm" && hours < 12) hours += 12;
        if (meridiem === "am" && hours === 12) hours = 0;
    } else if (hours > 23) {
        return null;
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const parseRotationFromLine = (line: string): { rotation: string | null; cleanedLine: string } => {
    const rotationMatch = line.match(/\b(?:rotation\s*[:-]?\s*|rot\s*[:-]?\s*)([a-z0-9]+)\b/i)
        ?? line.match(/\b([ab])(?:-?week)?\b/i);

    if (!rotationMatch) {
        return { rotation: null, cleanedLine: line };
    }

    const matchedValue = rotationMatch[1] ?? null;
    return {
        rotation: normalizeRotation(matchedValue),
        cleanedLine: normalizeWhitespace(line.replace(rotationMatch[0], " ")),
    };
};

const parseStructuredLine = (line: string): ParsedTimetableEntryDraft | null => {
    const parts = line.split("|").map((part) => normalizeWhitespace(part)).filter(Boolean);
    if (parts.length < 3) return null;

    let dayOfWeek: number | null = null;
    let startTime: string | null = null;
    let endTime: string | null = null;
    let rotation: string | null = null;
    let subjectName = "";

    if (parts.length >= 4 && resolveDayOfWeek(parts[0] ?? "") !== null) {
        dayOfWeek = resolveDayOfWeek(parts[0] ?? "");
        subjectName = normalizeWhitespace(parts[1] ?? "");
        startTime = normalizeTimeToken(parts[2] ?? "");
        endTime = normalizeTimeToken(parts[3] ?? "");
        rotation = normalizeRotation(parts[4] ?? null);
    } else if (parts.length >= 3 && resolveDayOfWeek(parts[0] ?? "") !== null) {
        const timeRange = (parts[1] ?? "").match(
            /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
        );
        if (!timeRange) return null;
        dayOfWeek = resolveDayOfWeek(parts[0] ?? "");
        startTime = normalizeTimeToken(timeRange[1] ?? "");
        endTime = normalizeTimeToken(timeRange[2] ?? "");
        subjectName = normalizeWhitespace(parts[2] ?? "");
        rotation = normalizeRotation(parts[3] ?? null);
    } else if (parts.length >= 3 && resolveDayOfWeek(parts[2] ?? "") !== null) {
        const timeRange = (parts[0] ?? "").match(
            /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
        );
        if (!timeRange) return null;
        dayOfWeek = resolveDayOfWeek(parts[2] ?? "");
        startTime = normalizeTimeToken(timeRange[1] ?? "");
        endTime = normalizeTimeToken(timeRange[2] ?? "");
        subjectName = normalizeWhitespace(parts[1] ?? "");
        rotation = normalizeRotation(parts[3] ?? null);
    } else {
        return null;
    }

    if (!subjectName) return null;

    const warnings: string[] = [];
    if ((startTime === null || endTime === null) && line.match(/\d/)) {
        warnings.push("Invalid time value");
    }

    return {
        subjectName,
        dayOfWeek,
        startTime,
        endTime,
        rotation,
        confidence: parts.length >= 4 ? 0.97 : 0.88,
        sourceLine: line,
        ...(warnings.length > 0 ? { warnings } : {}),
    };
};

const parseFlexibleLine = (line: string): ParsedTimetableEntryDraft | null => {
    const compact = normalizeWhitespace(line);
    if (!compact) return null;

    const timeRangeMatch = compact.match(
        /([0-9oOilI]{1,2}(?::[0-9oOilI]{2})?\s*(?:am|pm)?)\s*(?:-|to)\s*([0-9oOilI]{1,2}(?::[0-9oOilI]{2})?\s*(?:am|pm)?)/i,
    );
    const singleTimeMatch = !timeRangeMatch
        ? compact.match(/\b([0-9oOilI]{1,2}(?::[0-9oOilI]{2})?\s*(?:am|pm)?)\b/i)
        : null;

    if (!timeRangeMatch && !singleTimeMatch) return null;

    const warnings: string[] = [];
    const startTime = normalizeTimeToken((timeRangeMatch?.[1] ?? singleTimeMatch?.[1]) ?? "");
    const endTime = timeRangeMatch ? normalizeTimeToken(timeRangeMatch[2] ?? "") : null;
    if ((timeRangeMatch || singleTimeMatch) && !startTime) {
        warnings.push("Invalid time value");
    }
    if (timeRangeMatch && !endTime) {
        warnings.push("Invalid time value");
    }

    const withoutTimes = normalizeWhitespace(
        compact.replace(timeRangeMatch?.[0] ?? singleTimeMatch?.[0] ?? "", " "),
    );
    const dayToken = withoutTimes
        .split(/\s+/)
        .find((token) => resolveDayOfWeek(token) !== null) ?? null;
    const dayOfWeek = dayToken ? resolveDayOfWeek(dayToken) : null;
    const withoutDay = dayToken
        ? normalizeWhitespace(withoutTimes.replace(new RegExp(`\\b${dayToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"), " "))
        : withoutTimes;

    const { rotation, cleanedLine } = parseRotationFromLine(withoutDay);
    const subjectName = normalizeWhitespace(
        cleanedLine
            .replace(/^[|,:;-]+/, "")
            .replace(/[|,:;-]+$/, ""),
    );

    if (!subjectName) return null;

    return {
        subjectName,
        dayOfWeek,
        startTime,
        endTime,
        rotation,
        confidence: timeRangeMatch
            ? (dayOfWeek !== null && startTime && endTime ? 0.86 : 0.62)
            : (dayOfWeek !== null && startTime ? 0.72 : 0.56),
        sourceLine: line,
        ...(warnings.length > 0 ? { warnings } : {}),
    };
};

const splitTableCells = (line: string): string[] => {
    if (line.includes("|")) {
        return line
            .split("|")
            .map((cell) => normalizeWhitespace(cell))
            .filter(Boolean);
    }

    return line
        .split(/\t+|\s{2,}/)
        .map((cell) => normalizeWhitespace(cell))
        .filter(Boolean);
};

const parseTimeRange = (value: string): { startTime: string | null; endTime: string | null } | null => {
    const match = value.match(
        /([0-9oOilI]{1,2}(?::[0-9oOilI]{2})?\s*(?:am|pm)?)\s*(?:-|to)\s*([0-9oOilI]{1,2}(?::[0-9oOilI]{2})?\s*(?:am|pm)?)/i,
    );
    if (!match) return null;
    return {
        startTime: normalizeTimeToken(match[1] ?? ""),
        endTime: normalizeTimeToken(match[2] ?? ""),
    };
};

const parseTableGridEntries = (lines: string[]): { entries: ParsedTimetableEntryDraft[]; consumedIndexes: Set<number> } => {
    const entries: ParsedTimetableEntryDraft[] = [];
    const consumedIndexes = new Set<number>();

    for (let rowIndex = 0; rowIndex < lines.length; rowIndex += 1) {
        const headerCells = splitTableCells(lines[rowIndex] ?? "");
        if (headerCells.length < 3) continue;
        if (!/^day$/i.test(headerCells[0] ?? "")) continue;

        const timeSlots = headerCells
            .slice(1)
            .map((cell) => parseTimeRange(cell))
            .filter((slot): slot is { startTime: string | null; endTime: string | null } => slot !== null);

        if (timeSlots.length === 0) continue;

        let hasDataRows = false;
        const localConsumed = [rowIndex];

        for (let dataIndex = rowIndex + 1; dataIndex < lines.length; dataIndex += 1) {
            const rowCells = splitTableCells(lines[dataIndex] ?? "");
            if (rowCells.length < 2) break;

            const dayOfWeek = resolveDayOfWeek(rowCells[0] ?? "");
            if (dayOfWeek === null) break;

            hasDataRows = true;
            localConsumed.push(dataIndex);

            for (let slotIndex = 0; slotIndex < timeSlots.length; slotIndex += 1) {
                const subjectCell = normalizeWhitespace(rowCells[slotIndex + 1] ?? "");
                if (!subjectCell || /^(-|n\/a|na|break|lunch)$/i.test(subjectCell)) {
                    continue;
                }

                const { rotation, cleanedLine } = parseRotationFromLine(subjectCell);
                const subjectName = normalizeWhitespace(cleanedLine);
                if (!subjectName) continue;

                entries.push({
                    subjectName,
                    dayOfWeek,
                    startTime: timeSlots[slotIndex]?.startTime ?? null,
                    endTime: timeSlots[slotIndex]?.endTime ?? null,
                    rotation,
                    confidence: 0.9,
                    sourceLine: lines[dataIndex],
                });
            }
        }

        if (hasDataRows) {
            localConsumed.forEach((index) => consumedIndexes.add(index));
            rowIndex = Math.max(...localConsumed);
        }
    }

    return { entries, consumedIndexes };
};

const ensureWarning = (entry: ParsedTimetableEntryDraft, warning: string) => {
    entry.warnings = entry.warnings ?? [];
    if (!entry.warnings.includes(warning)) {
        entry.warnings.push(warning);
    }
};

const buildEntryWarnings = (entry: ParsedTimetableEntryDraft) => {
    if (entry.dayOfWeek === null) ensureWarning(entry, "Missing day of week");
    if (!entry.startTime) ensureWarning(entry, "Missing start time");
    if (!entry.endTime) ensureWarning(entry, "Missing end time");
    if (entry.startTime && entry.endTime && toMinuteOfDay(entry.endTime) <= toMinuteOfDay(entry.startTime)) {
        ensureWarning(entry, "End time must be after start time");
    }
    if (entry.confidence < 0.5) ensureWarning(entry, "Low confidence parse");
    else if (entry.confidence < 0.8) ensureWarning(entry, "Review suggested");
};

const dedupePreviewEntries = (entries: ParsedTimetableEntryDraft[]): ParsedTimetableEntryDraft[] => {
    const seen = new Set<string>();
    const result: ParsedTimetableEntryDraft[] = [];

    for (const entry of entries) {
        const key = [
            entry.subjectName.toLowerCase(),
            entry.dayOfWeek ?? "x",
            entry.startTime ?? "x",
            entry.endTime ?? "x",
            entry.rotation ?? "x",
        ].join("|");

        if (seen.has(key)) {
            const existing = result.find((candidate) =>
                [
                    candidate.subjectName.toLowerCase(),
                    candidate.dayOfWeek ?? "x",
                    candidate.startTime ?? "x",
                    candidate.endTime ?? "x",
                    candidate.rotation ?? "x",
                ].join("|") === key,
            );
            if (existing) ensureWarning(existing, "Duplicate row in import");
            continue;
        }
        seen.add(key);
        result.push(entry);
    }

    return result;
};

const annotateOverlapWarnings = (entries: ParsedTimetableEntryDraft[]) => {
    for (const entry of entries) {
        if (entry.dayOfWeek === null || !entry.startTime || !entry.endTime) continue;
        const entryStart = toMinuteOfDay(entry.startTime);
        const entryEnd = toMinuteOfDay(entry.endTime);

        for (const candidate of entries) {
            if (candidate === entry) continue;
            if (candidate.dayOfWeek !== entry.dayOfWeek || !candidate.startTime || !candidate.endTime) continue;
            const candidateStart = toMinuteOfDay(candidate.startTime);
            const candidateEnd = toMinuteOfDay(candidate.endTime);

            if (entryStart < candidateEnd && candidateStart < entryEnd) {
                ensureWarning(entry, `Overlaps with ${candidate.subjectName}`);
            }
        }
    }
};

const annotateExistingDuplicateWarnings = (
    entries: ParsedTimetableEntryDraft[],
    existingEntries: Array<Pick<TimetableEntryWithSubject, "dayOfWeek" | "startTime" | "endTime" | "rotation" | "subject">>,
) => {
    for (const entry of entries) {
        const duplicate = existingEntries.find((existing) =>
            existing.dayOfWeek === entry.dayOfWeek &&
            existing.startTime === entry.startTime &&
            existing.endTime === entry.endTime &&
            (existing.rotation ?? null) === (entry.rotation ?? null) &&
            existing.subject.name.trim().toLowerCase() === entry.subjectName.trim().toLowerCase()
        );

        if (duplicate) {
            ensureWarning(entry, "Already exists in timetable");
        }
    }
};

const minuteToTimeValue = (minuteValue: number): string => {
    const clamped = Math.max(0, Math.min(MINUTES_PER_DAY - 1, minuteValue));
    const hour = Math.floor(clamped / 60);
    const minute = clamped % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const inferMissingEndTimes = (entries: ParsedTimetableEntryDraft[]) => {
    for (const entry of entries) {
        if (entry.dayOfWeek === null || !entry.startTime || entry.endTime) continue;

        const startMinute = toMinuteOfDay(entry.startTime);
        const nextStartMinute = entries
            .filter((candidate) =>
                candidate !== entry &&
                candidate.dayOfWeek === entry.dayOfWeek &&
                candidate.startTime,
            )
            .map((candidate) => toMinuteOfDay(candidate.startTime!))
            .filter((candidateMinute) => candidateMinute > startMinute)
            .sort((left, right) => left - right)[0];

        if (typeof nextStartMinute === "number") {
            entry.endTime = minuteToTimeValue(nextStartMinute);
            ensureWarning(entry, "End time inferred from next class");
            continue;
        }

        entry.endTime = minuteToTimeValue(startMinute + 60);
        ensureWarning(entry, "End time defaulted to 1 hour");
    }
};

const toIsoDate = (value: Date): string => value.toISOString().split("T")[0]!;

const startOfDay = (value: Date): Date => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
};

const endOfDay = (value: Date): Date => {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
};

const toMinuteOfDay = (timeValue: string): number => {
    const [hoursPart, minutesPart] = timeValue.split(":");
    const hours = Number.parseInt(hoursPart ?? "", 10);
    const minutes = Number.parseInt(minutesPart ?? "", 10);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return 0;
    }

    return Math.max(0, Math.min(MINUTES_PER_DAY, hours * 60 + minutes));
};

const minuteToLabel = (minuteValue: number): string => {
    const normalized = ((minuteValue % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    const hour = Math.floor(normalized / 60);
    const minute = normalized % 60;
    const suffix = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${formattedHour}:${String(minute).padStart(2, "0")} ${suffix}`;
};

export class TimetableService {
    previewTimetableImport(text: string): TimetableImportPreviewResult {
        const rawLines = text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .slice(0, 150);
        const lines = rawLines.map((line) => normalizeWhitespace(line));
        const normalizedLines = rawLines.filter((line, index) => line !== (lines[index] ?? "")).length;

        const entries: ParsedTimetableEntryDraft[] = [];
        const warnings: string[] = [];
        const tableGrid = parseTableGridEntries(rawLines);
        entries.push(...tableGrid.entries);
        let deterministicMatches = tableGrid.entries.length;

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
            if (tableGrid.consumedIndexes.has(lineIndex)) continue;
            const line = lines[lineIndex] ?? "";
            const parsed = parseStructuredLine(line) ?? parseFlexibleLine(line);
            if (parsed) {
                entries.push(parsed);
                deterministicMatches += 1;
            } else {
                warnings.push(`Skipped unrecognized line: "${line}"`);
            }
        }

        const deduped = dedupePreviewEntries(entries);
        inferMissingEndTimes(deduped);
        for (const entry of deduped) {
            buildEntryWarnings(entry);
        }
        annotateOverlapWarnings(deduped);

        if (deduped.length === 0 && lines.length > 0) {
            warnings.unshift("No timetable rows could be confidently extracted. Try one row per line, for example: Monday 09:00-10:00 Physics.");
        }

        return {
            entries: deduped,
            warnings: warnings.slice(0, 10),
            parser: {
                deterministicMatches,
                aiMatches: 0,
                normalizedLines,
            },
        };
    }

    decoratePreviewEntries(
        entries: ParsedTimetableEntryDraft[],
        existingEntries: Array<Pick<TimetableEntryWithSubject, "dayOfWeek" | "startTime" | "endTime" | "rotation" | "subject">> = [],
    ): ParsedTimetableEntryDraft[] {
        const nextEntries = entries.map((entry) => ({
            ...entry,
            warnings: [...(entry.warnings ?? [])],
        }));

        inferMissingEndTimes(nextEntries);
        for (const entry of nextEntries) {
            buildEntryWarnings(entry);
        }

        annotateOverlapWarnings(nextEntries);
        annotateExistingDuplicateWarnings(nextEntries, existingEntries);
        return nextEntries;
    }

    /**
     * Determines the current rotation based on the user's custom rotation pattern.
     * Falls back to algorithmic even/odd week if no custom pattern is defined.
     */
    async getRotationForDate(userId: string, date: Date): Promise<string> {
        // Try to find an active custom rotation pattern for this user
        const activePattern = await prisma.rotationPattern.findFirst({
            where: { userId, isActive: true },
            orderBy: { createdAt: "desc" },
        });

        if (activePattern) {
            const daysDiff = Math.floor(
                (date.getTime() - new Date(activePattern.startDate).getTime()) / (24 * 60 * 60 * 1000)
            );
            const cycleIndex = Math.floor(daysDiff / activePattern.cycleLengthDays);
            const patternIndex = ((cycleIndex % activePattern.pattern.length) + activePattern.pattern.length) % activePattern.pattern.length;
            return activePattern.pattern[patternIndex]!;
        }

        // Fallback: algorithmic A/B based on even/odd week of year
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDays = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const weekNumber = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);

        return weekNumber % 2 === 0 ? "B" : "A";
    }

    /**
     * Retrieves the daily schedule for a specific user and date.
     */
    async getHolidayForDate(userId: string, date: Date) {
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        return prisma.schoolHoliday.findFirst({
            where: {
                userId,
                startDate: { lte: dayEnd },
                endDate: { gte: dayStart },
            },
            orderBy: { startDate: "asc" },
        });
    }

    detectConflicts(params: {
        timetableEntries: TimetableEntryWithSubject[];
        exams: Awaited<ReturnType<typeof prisma.exam.findMany>>;
    }): ScheduleConflict[] {
        const conflicts: ScheduleConflict[] = [];
        const sortedEntries = [...params.timetableEntries].sort((a, b) => a.startTime.localeCompare(b.startTime));

        // Class vs class overlaps
        for (let index = 0; index < sortedEntries.length - 1; index += 1) {
            const current = sortedEntries[index]!;
            const next = sortedEntries[index + 1]!;
            const currentEnd = toMinuteOfDay(current.endTime);
            const nextStart = toMinuteOfDay(next.startTime);

            if (currentEnd > nextStart) {
                conflicts.push({
                    id: `class-overlap-${current.id}-${next.id}`,
                    type: "CLASS_OVERLAP",
                    severity: "high",
                    message: `${current.subject.name} overlaps with ${next.subject.name}`,
                    startsAt: current.startTime,
                    endsAt: next.endTime,
                    classEntryIds: [current.id, next.id],
                });
            }
        }

        // Class vs exam overlaps
        for (const entry of sortedEntries) {
            const classStartMinute = toMinuteOfDay(entry.startTime);
            const classEndMinute = toMinuteOfDay(entry.endTime);

            for (const exam of params.exams) {
                const examStartMinute = exam.date.getHours() * 60 + exam.date.getMinutes();
                const examDuration = Math.max(15, exam.durationMinutes ?? 0);
                const examEndMinute = Math.min(MINUTES_PER_DAY, examStartMinute + examDuration);

                const overlaps = classStartMinute < examEndMinute && classEndMinute > examStartMinute;
                if (!overlaps) continue;

                conflicts.push({
                    id: `exam-overlap-${entry.id}-${exam.id}`,
                    type: "EXAM_OVERLAP",
                    severity: "warning",
                    message: `${entry.subject.name} conflicts with exam "${exam.title}"`,
                    startsAt: minuteToLabel(Math.max(classStartMinute, examStartMinute)),
                    endsAt: minuteToLabel(Math.min(classEndMinute, examEndMinute)),
                    classEntryIds: [entry.id],
                    examId: exam.id,
                });
            }
        }

        return conflicts;
    }

    async getDailySchedule(userId: string, date: Date): Promise<DailyScheduleResult> {
        const dayOfWeek = date.getDay(); // 0 is Sunday
        const rotation = await this.getRotationForDate(userId, date);
        const holiday = await this.getHolidayForDate(userId, date);
        // Treat every Sunday as a holiday even if no DB entry exists
        const isSunday = date.getDay() === 0;
        const isHoliday = Boolean(holiday) || isSunday;
        const pauseNotifications = holiday?.pauseNotifications ?? isSunday;
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        // Fetch timetable entries matching the day and current rotation (or general entries)
        const entries = await prisma.timetable.findMany({
            where: {
                userId,
                dayOfWeek,
                OR: [
                    { rotation: rotation },
                    { rotation: null } // items that apply every week
                ]
            },
            include: {
                subject: true
            },
            orderBy: {
                startTime: 'asc'
            }
        });

        const exams = await prisma.exam.findMany({
            where: {
                userId,
                date: {
                    gte: dayStart,
                    lte: dayEnd,
                },
            },
            orderBy: { date: "asc" },
        });

        const conflicts = this.detectConflicts({
            timetableEntries: entries,
            exams,
        });

        return {
            date: toIsoDate(date),
            dayOfWeek,
            rotation,
            isHoliday,
            holidayName: holiday?.name ?? (isSunday ? 'Sunday' : null),
            pauseNotifications,
            conflicts,
            entries: isHoliday && pauseNotifications ? [] : entries,
        };
    }

    async listHolidays(userId: string) {
        return prisma.schoolHoliday.findMany({
            where: { userId },
            orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
        });
    }

    async createHoliday(params: {
        userId: string;
        name: string;
        startDate: Date;
        endDate: Date;
        pauseNotifications?: boolean;
    }) {
        return prisma.schoolHoliday.create({
            data: {
                userId: params.userId,
                name: params.name,
                startDate: params.startDate,
                endDate: params.endDate,
                pauseNotifications: params.pauseNotifications ?? true,
            },
        });
    }

    async updateHoliday(params: {
        id: string;
        userId: string;
        data: {
            name?: string;
            startDate?: Date;
            endDate?: Date;
            pauseNotifications?: boolean;
        };
    }): Promise<{ count: number }> {
        return prisma.schoolHoliday.updateMany({
            where: { id: params.id, userId: params.userId },
            data: params.data,
        });
    }

    async deleteHoliday(params: { id: string; userId: string }): Promise<{ count: number }> {
        return prisma.schoolHoliday.deleteMany({
            where: { id: params.id, userId: params.userId },
        });
    }

    // Timetable Entry CRUD
    async listTimetableEntries(userId: string) {
        return prisma.timetable.findMany({
            where: { userId },
            include: { subject: true },
            orderBy: [
                { dayOfWeek: "asc" },
                { startTime: "asc" },
                { createdAt: "asc" }
            ],
        });
    }

    async createTimetableEntry(params: {
        userId: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        subjectId: string;
        rotation?: string;
    }) {
        return prisma.timetable.create({
            data: {
                userId: params.userId,
                dayOfWeek: params.dayOfWeek,
                startTime: params.startTime,
                endTime: params.endTime,
                subjectId: params.subjectId,
                rotation: params.rotation || null,
            },
            include: {
                subject: true
            }
        });
    }

    async updateTimetableEntry(params: {
        id: string;
        userId: string;
        data: {
            dayOfWeek?: number;
            startTime?: string;
            endTime?: string;
            subjectId?: string;
            rotation?: string | null;
        };
    }) {
        return prisma.timetable.update({
            where: { id: params.id, userId: params.userId },
            data: params.data,
            include: {
                subject: true
            }
        });
    }

    async deleteTimetableEntry(params: { id: string; userId: string }) {
        return prisma.timetable.deleteMany({
            where: { id: params.id, userId: params.userId },
        });
    }

    // Subject CRUD
    async listSubjects(userId: string) {
        return prisma.subject.findMany({
            where: { userId },
            orderBy: { name: "asc" },
        });
    }

    async createSubject(params: { userId: string; name: string; color?: string; room?: string; teacher?: string }) {
        const updateData: any = {};
        if (params.color !== undefined) updateData.color = params.color;
        if (params.room !== undefined) updateData.room = params.room;
        if (params.teacher !== undefined) updateData.teacher = params.teacher;

        const createData: any = {
            userId: params.userId,
            name: params.name,
            color: params.color || "#3B82F6",
        };
        if (params.room !== undefined) createData.room = params.room;
        if (params.teacher !== undefined) createData.teacher = params.teacher;

        return prisma.subject.upsert({
            where: {
                userId_name: {
                    userId: params.userId,
                    name: params.name
                }
            },
            update: updateData,
            create: createData as any
        });
    }

    async deleteSubject(params: { id: string; userId: string }) {
        return prisma.subject.deleteMany({
            where: { id: params.id, userId: params.userId },
        });
    }
}

export const timetableService = new TimetableService();
