'use client';

import { useSession } from 'next-auth/react';
import { LayoutDashboard, Clock, Calendar, Receipt, Users } from 'lucide-react';
import { AppSidebar } from '@/components/ui/app-sidebar';

const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Attendance', href: '/dashboard/attendance', icon: Clock },
    { name: 'Leave Request', href: '/dashboard/time-off', icon: Calendar },
    { name: 'Expense Claim', href: '/dashboard/expenses', icon: Receipt },
];

// Managers and team leads also approve leave and see their team's attendance
const managerItems = [{ name: 'Team', href: '/dashboard/team', icon: Users }];
const PORTAL_LABEL = { MANAGER: 'MANAGER PORTAL', TEAM_LEAD: 'TEAM LEAD PORTAL' };

export function EmployeeSidebar() {
    const { data: session } = useSession();
    const role = session?.user?.role;
    // Team leads have no expense claim in their portal
    const base = role === 'TEAM_LEAD' ? navigationItems.filter((i) => i.href !== '/dashboard/expenses') : navigationItems;
    const items = [...base, ...(['MANAGER', 'TEAM_LEAD'].includes(role) ? managerItems : [])];

    return (
        <AppSidebar
            items={items}
            portalLabel={PORTAL_LABEL[role] || 'STAFF PORTAL'}
            profileHref="/profile"
        />
    );
}
