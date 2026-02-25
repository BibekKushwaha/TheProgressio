import { prisma } from "@repo/db";

export const getNotificationSettings = async (userId: string) => {
  try {
    const settingsRecord = await prisma.nudge.findFirst({
      where: {
        userId,
        type: "SYSTEM_PREFS",
        title: "Notification settings",
      },
      orderBy: { createdAt: "desc" },
      select: { metadata: true },
    });
    const parsed = (() => {
      if (!settingsRecord?.metadata) return {};
      try {
        return JSON.parse(settingsRecord.metadata) as any;
      } catch {
        return {};
      }
    })();
    return (parsed.settings ?? parsed) as any;
  } catch (_err) {
    // Keep callers responsible for handling null
    return null;
  }
};

export const getBucketForType = (type?: string) => {
  if (!type) return undefined;
  if (type === "MORNING_BRIEFING") return "MORNING_BRIEFING";
  if (type === "EXAM_WARNING" || type === "ADVANCE_ALERT_3WEEK") return "ADVANCE_ALERT_3WEEK";
  if (type === "TRANSACTION_SYSTEM") return "TRANSACTION_SYSTEM";
  if (type === "URGENCY_DRIVEN") return "URGENCY_DRIVEN";
  return "BEHAVIORAL_NUDGE";
};

const toMinutes = (value: string) => {
  const [h = "0", m = "0"] = value.split(":");
  return Number.parseInt(h, 10) * 60 + Number.parseInt(m, 10);
};

const isWithinWindow = (valueMinutes: number, window: { start: string; end: string }) => {
  const start = toMinutes(window.start);
  const end = toMinutes(window.end);
  if (start === end) return true;
  if (start < end) return valueMinutes >= start && valueMinutes < end;
  return valueMinutes >= start || valueMinutes < end;
};

const isUrgentType = (type?: string) => (type === "URGENCY_DRIVEN" || type === "STREAK_RISK");



export const shouldSendNotification = ({
  userSettings,
  category,
  urgency,
  now = new Date(),
}: {
  userSettings: any;
  category?: string;
  urgency?: boolean;
  now?: Date;
}): { allow: boolean; reason?: string } => {
  const settings = userSettings || {};

  // Determine bucket and urgency if not provided
  const bucket = getBucketForType(category);
  const isUrgent = typeof urgency === "boolean" ? urgency : isUrgentType(bucket as string);

  if (bucket && settings.enabledBuckets && settings.enabledBuckets[bucket] === false) {
    return { allow: false, reason: "bucket_disabled" };
  }

  if (!isUrgent) {
    const minute = now.getHours() * 60 + now.getMinutes();
    const inQuietHours = Array.isArray(settings.quietHours) && settings.quietHours.some((window: any) => isWithinWindow(minute, window));
    if (inQuietHours) return { allow: false, reason: "quiet_hours" };

    const activeMutedProfile = Array.isArray(settings.focusProfiles) && settings.focusProfiles.some((profile: any) => profile.enabled && profile.muteNonUrgent);
    if (activeMutedProfile) return { allow: false, reason: "focus_profile_muting" };
  }

  return { allow: true };
};

// Backwards-compatible wrapper
export const shouldSendWithCurrentContext = (
  settings: any,
  nudgeType: string,
  now: Date,
) => {
  return shouldSendNotification({ userSettings: settings, category: nudgeType, now }).allow;
};

export default {
  getNotificationSettings,
  getBucketForType,
  shouldSendWithCurrentContext,
  shouldSendNotification,
};
