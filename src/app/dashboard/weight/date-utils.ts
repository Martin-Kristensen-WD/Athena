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

export function startOfWeek(date: Date) {
  const start = new Date(date);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

export function averageForRange(
  dailyValues: Map<string, number>,
  rangeStart: Date,
  rangeEnd: Date
) {
  let sum = 0;
  let count = 0;
  const cursor = new Date(rangeStart);
  while (cursor < rangeEnd) {
    const value = dailyValues.get(dateKey(cursor));
    if (value !== undefined) {
      sum += value;
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count > 0 ? sum / count : null;
}
