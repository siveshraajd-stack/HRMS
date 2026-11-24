import { addDaysToKey, dayKey, dayStart, monthRange, weekdayOfKey } from '@/lib/dates';

const MINUTE = 60 * 1000;

/**
 * Minutes worked on one attendance record.
 * Prefers a complete biometric pair, then a complete web clock pair, then any in/out mix.
 * A day that is still open (no out time) counts up to `now`, but only for today.
 */
export function workedMinutes(record, now = new Date()) {
    if (!record) return 0;
    let inTime;
    let outTime;
    if (record.checkIn && record.checkOut) {
        inTime = record.checkIn;
        outTime = record.checkOut;
    } else if (record.clockIn && record.clockOut) {
        inTime = record.clockIn;
        outTime = record.clockOut;
    } else {
        inTime = record.checkIn || record.clockIn;
        outTime = record.checkOut || record.clockOut;
    }
    if (!inTime) return 0;
    const start = new Date(inTime).getTime();
    let end;
    if (outTime) {
        end = new Date(outTime).getTime();
    } else if (dayKey(record.date) === dayKey(now)) {
        end = now.getTime();
    } else {
        return 0; // forgot to clock out on a past day: unknown, not counted
    }
    if (!(end > start)) return 0;
    return Math.floor((end - start) / MINUTE);
}

/** Monday (IST) of the week that contains `now`, as a day key */
export function weekStartKey(now = new Date()) {
    const today = dayKey(now);
    return addDaysToKey(today, -((weekdayOfKey(today) + 6) % 7));
}

/** [start, end) instants that cover both the current week and the current month */
export function hoursQueryRange(now = new Date()) {
    const [y, m] = dayKey(now).split('-').map(Number);
    const month = monthRange(y, m);
    const week = { start: dayStart(weekStartKey(now)), end: dayStart(addDaysToKey(weekStartKey(now), 7)) };
    return {
        start: new Date(Math.min(month.start.getTime(), week.start.getTime())),
        end: new Date(Math.max(month.end.getTime(), week.end.getTime())),
    };
}

/** { todayMinutes, weekMinutes, monthMinutes } from a user's attendance records */
export function computeHourTotals(records, now = new Date()) {
    const today = dayKey(now);
    const monthPrefix = today.slice(0, 7);
    const weekStart = weekStartKey(now);
    const weekEnd = addDaysToKey(weekStart, 6);
    const totals = { todayMinutes: 0, weekMinutes: 0, monthMinutes: 0 };
    for (const record of records) {
        const key = dayKey(record.date);
        const minutes = workedMinutes(record, now);
        if (!minutes) continue;
        if (key === today) totals.todayMinutes += minutes;
        if (key >= weekStart && key <= weekEnd) totals.weekMinutes += minutes;
        if (key.startsWith(monthPrefix)) totals.monthMinutes += minutes;
    }
    return totals;
}

/** 485 -> '8h 05m' */
export function formatMinutes(minutes) {
    const total = Math.max(0, Math.round(Number(minutes) || 0));
    return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}m`;
}
