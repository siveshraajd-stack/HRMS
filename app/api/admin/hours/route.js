import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/access';
import { errorResponseParts } from '@/lib/errors';
import { computeHourTotals, hoursQueryRange } from '@/lib/work-hours';

// GET /api/admin/hours -> { hours: { [userId]: { todayMinutes, weekMinutes, monthMinutes } } } (HR only)
export async function GET() {
    try {
        const admin = await requireUser({ roles: ['ADMIN'] });
        const now = new Date();
        const { start, end } = hoursQueryRange(now);
        const records = await prisma.attendance.findMany({
            where: {
                date: { gte: start, lt: end },
                user: { companyId: admin.companyId, role: { in: ['EMPLOYEE', 'TEAM_LEAD', 'MANAGER'] } },
            },
        });
        const byUser = new Map();
        for (const r of records) {
            if (!byUser.has(r.userId)) byUser.set(r.userId, []);
            byUser.get(r.userId).push(r);
        }
        const hours = {};
        for (const [userId, rows] of byUser) hours[userId] = computeHourTotals(rows, now);
        return NextResponse.json({ hours });
    } catch (error) {
        const [body, status] = errorResponseParts(error, 'Failed to fetch hours worked');
        return NextResponse.json(body, { status });
    }
}
