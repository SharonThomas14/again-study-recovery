import { addDays } from "./planner.js";

const clockMinutes = (value) => {
  if (!/^\d{2}:\d{2}$/.test(value || "")) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour < 24 && minute < 60 ? hour * 60 + minute : null;
};

export function studyAvailability(events, start, deadline) {
  const result = {};
  for (let date = start, count = 0; date <= deadline && count < 91; date = addDays(date, 1), count++) {
    const weekend = [0, 6].includes(new Date(`${date}T12:00:00`).getDay());
    const windowStart = weekend ? 10 * 60 : 18 * 60;
    const windowEnd = weekend ? 13 * 60 : 20 * 60;
    const intervals = [];
    let allDayBusy = false;
    for (const event of events) {
      const inOriginalSpan = event.date <= date && date <= (event.endDate || event.date);
      const occurs = inOriginalSpan || (event.repeat && event.date < date && (!event.repeatUntil || date <= event.repeatUntil) &&
        Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${event.date}T12:00:00Z`)) / 86400000) % 7 === 0);
      if (!occurs || event.deadlineOnly) continue;
      const begin = clockMinutes(event.start);
      if (begin === null) {
        allDayBusy = true;
        break;
      }
      const intervalStart = inOriginalSpan && date > event.date ? 0 : begin;
      const finish = inOriginalSpan && date < (event.endDate || event.date) ? 24 * 60 :
        (clockMinutes(event.end) ?? Math.min(begin + 60, 24 * 60));
      if (finish > windowStart && intervalStart < windowEnd)
        intervals.push([Math.max(intervalStart, windowStart), Math.min(finish, windowEnd)]);
    }
    if (allDayBusy) { result[date] = 0; continue; }
    intervals.sort((a, b) => a[0] - b[0]);
    let occupied = 0, until = windowStart;
    for (const [begin, end] of intervals) {
      occupied += Math.max(0, end - Math.max(begin, until));
      until = Math.max(until, end);
    }
    result[date] = Math.max(0, windowEnd - windowStart - occupied);
  }
  return result;
}

export function parseHours(value, { allowZero = false, max = 50 } = {}) {
  const input = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(input)) return null;
  const hours = Number(input);
  if (hours > max || (!allowZero && hours <= 0)) return null;
  return Math.round(hours * 60);
}

export const hourInput = (minutes) => (Math.max(0, Number(minutes) || 0) / 60).toFixed(2);
