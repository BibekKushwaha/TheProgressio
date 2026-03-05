export const EFFORT_OPTIONS = ["30m", "1h", "2h", "4h+"] as const;
export type EffortOption = (typeof EFFORT_OPTIONS)[number];
export const DB_EFFORT_OPTIONS = ["M30", "H1", "H2", "H4_PLUS"] as const;
export type DbEffortOption = (typeof DB_EFFORT_OPTIONS)[number];

const API_TO_DB_EFFORT: Record<EffortOption, DbEffortOption> = {
  "30m": "M30",
  "1h": "H1",
  "2h": "H2",
  "4h+": "H4_PLUS",
};

const DB_TO_API_EFFORT: Record<DbEffortOption, EffortOption> = {
  M30: "30m",
  H1: "1h",
  H2: "2h",
  H4_PLUS: "4h+",
};

export const EFFORT_MINUTES: Record<EffortOption, number> = {
  "30m": 30,
  "1h": 60,
  "2h": 120,
  "4h+": 240,
};

export const normalizeEffortValue = (value?: unknown): EffortOption | undefined => {
  if (typeof value !== "string") return undefined;
  const s = value.trim().toLowerCase();
  if (!s) return undefined;

  if (EFFORT_OPTIONS.includes(s as EffortOption)) return s as EffortOption;
  if (s === "2h+") return "2h";

  const minuteMatch = s.match(/^(\d+(?:\.\d+)?)m$/);
  if (minuteMatch) {
    const mins = parseFloat(minuteMatch[1]!);
    if (mins <= 45) return "30m";
    if (mins <= 90) return "1h";
    if (mins <= 150) return "2h";
    return "4h+";
  }

  const hourMatch = s.match(/^(\d+(?:\.\d+)?)h(?:\+)?$/);
  if (hourMatch) {
    const hrs = parseFloat(hourMatch[1]!);
    if (hrs <= 0.75) return "30m";
    if (hrs <= 1.5) return "1h";
    if (hrs <= 3) return "2h";
    return "4h+";
  }

  return undefined;
};

export const effortToMinutes = (value?: unknown): number | null => {
  const normalized = normalizeEffortValue(value);
  if (!normalized) return null;
  return EFFORT_MINUTES[normalized];
};

export const toDbEffortValue = (value?: unknown): DbEffortOption | undefined => {
  const normalized = normalizeEffortValue(value);
  if (!normalized) return undefined;
  return API_TO_DB_EFFORT[normalized];
};

export const fromDbEffortValue = (value?: unknown): EffortOption | undefined => {
  if (typeof value !== "string") return undefined;
  if (DB_EFFORT_OPTIONS.includes(value as DbEffortOption)) {
    return DB_TO_API_EFFORT[value as DbEffortOption];
  }
  return normalizeEffortValue(value);
};
