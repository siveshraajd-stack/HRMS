'use client';

import { useSession, signOut } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { PageShell } from '@/components/ui/page-shell';
import { StaffNameSection } from '@/components/profile/staff-name-section';

const fmtDate = (value) =>
    value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '-';

function Field({ label, value }) {
    return (
        <div className="min-w-0">
            <p className="k-label mb-1">{label}</p>
            <p className="text-sm font-semibold break-words">{value || '-'}</p>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <section className="k-card p-6">
            <p className="k-label mb-4">{title}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-x-8 gap-y-5">{children}</div>
        </section>
    );
}

export default function ProfilePage() {
    const { data: session } = useSession();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadProfile = useCallback(async () => {
        if (!session?.user?.id) return;
        try {
            const response = await fetch(`/api/profile/${session.user.id}`);
            if (response.ok) setProfile(await response.json());
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    }, [session?.user?.id]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    // Managers / team leads (and HR) can set the name their notifications come from
    const isStaff = ['TEAM_LEAD', 'MANAGER', 'ADMIN'].includes(session?.user?.role);

    const user = profile?.user || {};
    const p = profile?.profile || {};
    const job = profile?.jobDetails || {};

    const logout = (
        <button onClick={() => signOut({ callbackUrl: '/' })} className="k-btn !bg-red-600 hover:!bg-red-700">
            LOG OUT
        </button>
    );

    return (
        <PageShell title="My Profile" actions={logout}>
            {loading ? (
                <p className="text-sm font-semibold text-[var(--ink-soft)]">Loading...</p>
            ) : !profile ? (
                <p className="text-sm font-semibold text-[var(--ink-soft)]">Not found</p>
            ) : (
                <div className="w-full space-y-5">
                    <div className="k-card p-6 flex items-center gap-5">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-white text-3xl font-bold shrink-0">
                            {p.profilePicture ? (
                                <img src={p.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                user.name?.charAt(0)?.toUpperCase() || 'U'
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-2xl font-bold truncate">{user.name || '-'}</p>
                            <span className="k-chip bg-primary-50 text-primary-700 mt-1">{user.employeeId || '-'}</span>
                        </div>
                    </div>

                    {isStaff && <StaffNameSection onSaved={loadProfile} />}

                    <Section title="Work">
                        <Field label="Department" value={job.department} />
                        <Field label="Job Position" value={job.jobPosition} />
                        <Field label="Manager" value={user.manager?.name || job.manager} />
                        <Field label="Work Location" value={job.workLocation} />
                        <Field label="Date of Joining" value={fmtDate(job.dateOfJoining)} />
                    </Section>

                    <Section title="Contact">
                        <Field label="Email" value={user.email} />
                        <Field label="Phone" value={user.phone} />
                        <Field label="Address" value={p.residingAddress} />
                    </Section>

                    <Section title="Personal">
                        <Field label="Date of Birth" value={fmtDate(p.dateOfBirth)} />
                        <Field label="Gender" value={p.gender} />
                        <Field label="Marital Status" value={p.maritalStatus} />
                        <Field label="Nationality" value={p.nationality} />
                        <Field label="Parent Name" value={p.parentName} />
                        <Field label="Parent Phone" value={p.parentPhone} />
                    </Section>

                    {(p.about || p.jobLoves || p.interestsHobbies) && (
                        <Section title="About">
                            {p.about && <Field label="About" value={p.about} />}
                            {p.jobLoves && <Field label="Job" value={p.jobLoves} />}
                            {p.interestsHobbies && <Field label="Interests" value={p.interestsHobbies} />}
                        </Section>
                    )}
                </div>
            )}
        </PageShell>
    );
}
