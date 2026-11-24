/** @jest-environment node */
import { workedMinutes, computeHourTotals, weekStartKey, formatMinutes } from '@/lib/work-hours';
import { dayStart } from '@/lib/dates';
import { encryptSecret, decryptSecret } from '@/lib/password-vault';
import crypto from 'crypto';

// Thursday 19 Nov 2026, 15:00 IST
const NOW = new Date('2026-11-19T09:30:00Z');
const day = (key, inH, outH) => ({
    date: dayStart(key),
    clockIn: inH == null ? null : new Date(dayStart(key).getTime() + inH * 3600000),
    clockOut: outH == null ? null : new Date(dayStart(key).getTime() + outH * 3600000),
    checkIn: null,
    checkOut: null,
});

describe('work hours', () => {
    it('counts a complete day', () => {
        expect(workedMinutes(day('2026-11-18', 9, 17.5), NOW)).toBe(510);
    });

    it('open past day counts 0, open today counts up to now', () => {
        expect(workedMinutes(day('2026-11-17', 9, null), NOW)).toBe(0);
        expect(workedMinutes(day('2026-11-19', 9, null), NOW)).toBe(360);
    });

    it('prefers a complete biometric pair', () => {
        const r = { ...day('2026-11-18', 9, 10), checkIn: new Date(dayStart('2026-11-18').getTime() + 8 * 3600000), checkOut: new Date(dayStart('2026-11-18').getTime() + 18 * 3600000) };
        expect(workedMinutes(r, NOW)).toBe(600);
    });

    it('week starts on Monday and totals are bucketed correctly', () => {
        expect(weekStartKey(NOW)).toBe('2026-11-16');
        const records = [
            day('2026-11-15', 9, 17), // Sunday of previous week: month only
            day('2026-11-16', 9, 17), // Monday
            day('2026-11-19', 9, null), // today, open (6h)
            day('2026-10-30', 9, 17), // previous month: ignored
        ];
        const t = computeHourTotals(records, NOW);
        expect(t.todayMinutes).toBe(360);
        expect(t.weekMinutes).toBe(480 + 360);
        expect(t.monthMinutes).toBe(480 + 480 + 360);
    });

    it('formats minutes', () => {
        expect(formatMinutes(485)).toBe('8h 05m');
        expect(formatMinutes(undefined)).toBe('0h 00m');
    });
});

describe('password vault', () => {
    const key = crypto.createHash('sha256').update('test-secret').digest();
    it('round-trips and rejects a wrong key', () => {
        const enc = encryptSecret('Temp@1234', key);
        expect(enc).not.toContain('Temp@1234');
        expect(decryptSecret(enc, key)).toBe('Temp@1234');
        expect(decryptSecret(enc, crypto.createHash('sha256').update('other').digest())).toBeNull();
    });
});
