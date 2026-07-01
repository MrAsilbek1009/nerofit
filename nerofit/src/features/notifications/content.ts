import { REMINDER_IDS, type ReminderId, type ReminderTexts } from "@/lib/notifications";

// Minimal translate signature — accepts any i18n key plus optional interpolation
// values. Keeps this module decoupled from react-i18next's typed TFunction.
export type Translate = (key: string, options?: Record<string, unknown>) => string;

// How many body variants each reminder has in the locale files. Rotating a
// variant by day keeps the copy from feeling robotic. The streak body is chosen
// by data (count) instead, so it isn't rotated.
const VARIANT_COUNTS: Record<ReminderId, number> = {
  supplements: 1,
  water: 2,
  workout: 2,
  streak: 1,
};

// 1-based day of the year — deterministic per calendar day, so variant choice is
// stable within a day and unit-testable.
export function dayOfYear(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

// i18n key for a reminder's body. Streak is data-driven (no active streak vs an
// N-day streak); the rest rotate a variant by day.
export function reminderBodyKey(
  id: ReminderId,
  opts: { streak: number; day: number },
): string {
  if (id === "streak") {
    return opts.streak > 0 ? "reminders.streak.body.active" : "reminders.streak.body.none";
  }
  const count = VARIANT_COUNTS[id];
  if (count <= 1) return `reminders.${id}.body`;
  const variant = ((opts.day % count) + count) % count;
  return variant === 0 ? `reminders.${id}.body` : `reminders.${id}.body${variant + 1}`;
}

// Build the localized copy for every reminder. The streak body interpolates the
// current streak count.
export function buildReminderTexts(
  t: Translate,
  opts: { streak: number; day?: number },
): ReminderTexts {
  const day = opts.day ?? dayOfYear();
  return REMINDER_IDS.reduce((acc, id) => {
    const bodyKey = reminderBodyKey(id, { streak: opts.streak, day });
    acc[id] = {
      title: t(`reminders.${id}.title`),
      body: t(bodyKey, id === "streak" ? { count: opts.streak } : undefined),
    };
    return acc;
  }, {} as ReminderTexts);
}
