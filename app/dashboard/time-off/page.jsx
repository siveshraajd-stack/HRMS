'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { PageShell } from '@/components/ui/page-shell';
import { LeaveTable } from '@/components/leave/leave-table';
import { LeaveBalance } from '@/components/leave/leave-balance';
import { LEAVE_TYPES } from '@/lib/constants';
import { dayKey } from '@/lib/dates';

const empty = { type: '', startDate: '', endDate: '', reason: '', compensateForDate: '', siteLocation: '', projectName: '' };

export default function EmployeeTimeOffPage() {
    const [leaves, setLeaves] = useState([]);
    const [balance, setBalance] = useState(null);
    const [hrNames, setHrNames] = useState([]);
    const [reportingManager, setReportingManager] = useState(null);
    const { data: session } = useSession();
    const isEmployee = session?.user?.role === 'EMPLOYEE';
    const [leads, setLeads] = useState([]);
    const [currentLead, setCurrentLead] = useState(null);
    const [savingLead, setSavingLead] = useState(false);
    const [form, setForm] = useState(empty);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        const res = await fetch('/api/leaves');
        if (res.ok) {
            const data = await res.json();
            setLeaves(data.leaves || []);
            setBalance(data.balance || null);
            setHrNames(data.hrNames || []);
            setReportingManager(data.reportingManager || null);
        }
    }, []);

    const loadLeads = useCallback(async () => {
        try {
            const res = await fetch('/api/account/team-lead', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setLeads(data.teamLeads || []);
                setCurrentLead(data.current || null);
            }
        } catch {
            /* the list stays empty */
        }
    }, []);

    useEffect(() => {
        if (isEmployee) loadLeads();
    }, [isEmployee, loadLeads]);

    // Employee picks another team leader: saved straight away, the request goes to that person first
    const changeLead = async (e) => {
        const managerId = e.target.value;
        if (!managerId || managerId === currentLead?.id) return;
        setSavingLead(true);
        setError('');
        setMessage('');
        try {
            const res = await fetch('/api/account/team-lead', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ managerId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not change team leader');
            await loadLeads();
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setSavingLead(false);
        }
    };

    useEffect(() => {
        load();
        // pick up the team lead / manager / HR decision without a manual refresh
        const timer = setInterval(load, 15000);
        return () => clearInterval(timer);
    }, [load]);

    const change = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        // Frontend validation (the server validates again)
        if (!form.type) return setError('Please select a time off category');
        if (!form.startDate || !form.endDate) return setError('From date and To date are required');
        if (form.startDate < dayKey()) return setError('Leave can only be requested for today or a future date. Past dates are not allowed.');
        if (form.endDate < form.startDate) return setError('To date cannot be before From date');
        if (form.type === 'COMPENSATE') {
            if (!form.compensateForDate) return setError('Select the date you worked, to compensate for this leave');
            if (form.compensateForDate > dayKey()) return setError('The worked date cannot be in the future');
            if (form.compensateForDate >= form.startDate) return setError('The worked date must be before the leave start date');
        }
        // Reason is optional for On Duty requests only
        if (form.type !== 'OD' && !form.reason.trim()) return setError('Reason is required');

        setSubmitting(true);
        try {
            const res = await fetch('/api/leaves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to submit request');
            setMessage(data.message);
            setForm(empty);
            setShowForm(false);
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const field = 'k-input';
    const label = 'k-label block mb-1.5';

    // Heads-up when the chosen category (Sick / Casual) has nothing left. The server enforces it too.
    const picked = form.type ? balance?.[form.type.toLowerCase()] : null;
    const pickedLeft = picked ? Math.max(0, picked.remaining - (balance?.pending?.[form.type.toLowerCase()] || 0)) : null;

    return (
        <PageShell
            title="Leave Request"
            actions={
                <button onClick={() => { setShowForm(!showForm); setError(''); }} className="k-btn">
                    {showForm ? 'Cancel' : '+ New request'}
                </button>
            }
        >
            <div className="max-w-5xl space-y-6">
                <section className="k-rise">
                    <p className="k-label mb-3">Balance</p>
                    <LeaveBalance balance={balance} />
                </section>

                {message && <div className="k-card px-5 py-3 text-sm font-semibold text-secondary-700 !bg-secondary-50">{message}</div>}
                {error && !showForm && <div className="k-card px-5 py-3 text-sm font-semibold text-red-600 !bg-red-50">{error}</div>}

                {showForm && (
                    <form onSubmit={submit} className="k-card k-rise p-6 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
                        {error && <div className="md:col-span-2 rounded-xl bg-red-50 text-red-600 text-sm font-semibold px-4 py-3" role="alert">{error}</div>}
                        {isEmployee ? (
                            <>
                                <div>
                                    <label className={label}>Team leader <span className="text-red-500">*</span></label>
                                    <select
                                        value={currentLead?.id || ''}
                                        onChange={changeLead}
                                        disabled={savingLead}
                                        className={field}
                                        aria-label="Team leader"
                                    >
                                        {!currentLead ? <option value="">Select team leader</option> : null}
                                        {currentLead && !leads.some((l) => l.id === currentLead.id) ? <option value={currentLead.id}>{currentLead.name}</option> : null}
                                        {leads.map((l) => (
                                            <option key={l.id} value={l.id}>{l.name}{l.employeeId ? ` (${l.employeeId})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={label}>Manager</label>
                                    <input
                                        type="text"
                                        value={currentLead ? currentLead.managerName || 'Not assigned (goes to HR)' : '-'}
                                        readOnly
                                        disabled
                                        aria-readonly="true"
                                        className={`${field} cursor-not-allowed opacity-80`}
                                    />
                                </div>
                                <p className="md:col-span-2 -mt-2 text-[11px] text-[var(--ink-soft)]">Your request goes to your team leader first, then the manager, then HR. Only HR can change the manager.</p>
                            </>
                        ) : (
                            <div className="md:col-span-2">
                                <label className={label}>Reporting manager</label>
                                <input
                                    type="text"
                                    value={reportingManager?.name || 'Not assigned'}
                                    readOnly
                                    disabled
                                    aria-readonly="true"
                                    className={`${field} cursor-not-allowed opacity-80`}
                                />
                            </div>
                        )}
                        <div className="md:col-span-2">
                            <label className={label}>Category <span className="text-red-500">*</span></label>
                            <select name="type" value={form.type} onChange={change} className={field} required>
                                <option value="">Select category</option>
                                {Object.entries(LEAVE_TYPES).map(([value, text]) => (
                                    <option key={value} value={value}>{text}</option>
                                ))}
                            </select>
                            {picked && (
                                <p className={`mt-2 text-xs font-semibold ${pickedLeft === 0 ? 'text-red-600' : 'text-secondary-700'}`}>
                                    {pickedLeft === 0 ? 'None left' : `${pickedLeft} left`}
                                </p>
                            )}
                        </div>
                        {form.type === 'COMPENSATE' && (
                            <div className="md:col-span-2">
                                <label className={label}>Date worked (being compensated) <span className="text-red-500">*</span></label>
                                <input type="date" name="compensateForDate" value={form.compensateForDate} max={dayKey()} onChange={change} className={field} required />
                                <p className="mt-1 text-[11px] text-[var(--ink-soft)]">The day you worked extra. The leave dates below are the days you take off in return.</p>
                            </div>
                        )}
                        {form.type === 'OD' && (
                            <>
                                <div>
                                    <label className={label}>Site location</label>
                                    <input name="siteLocation" value={form.siteLocation} onChange={change} maxLength={120} className={field} placeholder="City / site" />
                                </div>
                                <div>
                                    <label className={label}>Project name</label>
                                    <input name="projectName" value={form.projectName} onChange={change} maxLength={120} className={field} />
                                </div>
                            </>
                        )}
                        <div>
                            <label className={label}>From date <span className="text-red-500">*</span></label>
                            <input type="date" name="startDate" value={form.startDate} min={dayKey()} onChange={change} className={field} required />
                        </div>
                        <div>
                            <label className={label}>To date <span className="text-red-500">*</span></label>
                            <input type="date" name="endDate" value={form.endDate} min={form.startDate && form.startDate > dayKey() ? form.startDate : dayKey()} onChange={change} className={field} required />
                        </div>
                        <div className="md:col-span-2">
                            <label className={label}>Reason {form.type === 'OD' ? <span className="text-[var(--ink-soft)] font-normal">(optional)</span> : <span className="text-red-500">*</span>}</label>
                            <textarea name="reason" value={form.reason} onChange={change} rows={3} maxLength={500} className={field} required={form.type !== 'OD'} placeholder={form.type === 'OD' ? 'Reason (optional)' : 'Reason'} />
                        </div>
                        <div className="md:col-span-2">
                            <button type="submit" disabled={submitting} className="k-btn">
                                {submitting ? 'Sending...' : 'Submit request'}
                            </button>
                        </div>
                    </form>
                )}

                <section>
                    <p className="k-label mb-3">Requests</p>
                    <LeaveTable leaves={leaves} showManager hrNames={hrNames} emptyText="No requests" />
                </section>
            </div>
        </PageShell>
    );
}
