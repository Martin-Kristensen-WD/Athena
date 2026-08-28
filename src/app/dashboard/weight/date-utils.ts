import { dateKey, entryDayKey } from "@/lib/date";

export { dateKey, entryDayKey };

export function computeStreak(trackedDays: Set<string>, todayStart: Date) {
  const cursor = new Date(todayStart);
  if (!trackedDays.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (trackedDays.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
