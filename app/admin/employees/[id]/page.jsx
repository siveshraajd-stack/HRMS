'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { MonthCalendar } from '@/components/attendance/month-calendar';

export default function EmployeeDetailPage() {
    const { data: session } = useSession();
    const params = useParams();
    const router = useRouter();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('resume');
    const [editingAbout, setEditingAbout] = useState(false);
    const [aboutForm, setAboutForm] = useState({ about: '', jobLoves: '', interestsHobbies: '' });
    const [aboutSaving, setAboutSaving] = useState(false);
    const [aboutError, setAboutError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            const resolvedParams = await params;
            if (resolvedParams.id) {
                fetchEmployee(resolvedParams.id);
            }
        };
        fetchData();
    }, [params]);

    const fetchEmployee = async (id) => {
        try {
            const response = await fetch(`/api/admin/employees/${id}`);
            const data = await response.json();
            setEmployee(data.employee);
        } catch (error) {
            console.error('Failed to fetch employee:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block w-12 h-12 border border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-600">Loading employee details...</p>
                </div>
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-600">Employee not found.</p>
            </div>
        );
    }

    const isAdmin = session?.user?.role === 'ADMIN';

    const startEditAbout = () => {
        setAboutForm({
            about: employee.profile?.about || '',
            jobLoves: employee.profile?.jobLoves || '',
            interestsHobbies: employee.profile?.interestsHobbies || '',
        });
        setAboutError('');
        setEditingAbout(true);
    };

    const saveAbout = async () => {
        setAboutSaving(true);
        setAboutError('');
        try {
            const res = await fetch(`/api/admin/employees/${employee.id}/about`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(aboutForm),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save');
            setEmployee((prev) => ({ ...prev, profile: { ...(prev.profile || {}), ...data.profile } }));
            setEditingAbout(false);
        } catch (err) {
            setAboutError(err.message);
        } finally {
            setAboutSaving(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            <AdminSidebar />
            <main className="flex-1 ml-64 p-8">
                <div className="mb-10">
                    <button
                        onClick={() => router.back()}
                        className="text-[10px] font-bold uppercase tracking-wide border border-gray-200 px-6 py-2 shadow-sm hover:shadow-none transition-all mb-8 flex items-center gap-3 bg-white"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        [ BACK_TO_WORKFORCE_REGISTRY ]
                    </button>

                    <div className="relative border border-gray-200 bg-white shadow-sm p-10 overflow-hidden">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-12 relative z-10">
                            {/* Profile Image with Industrial Frame */}
                            <div className="relative">
                                <div className="w-40 h-40 border border-gray-200 overflow-hidden shadow-sm bg-gray-100">
                                    {employee.profile?.profilePicture ? (
                                        <img src={employee.profile.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-300 ">
                                            {employee.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-primary-700 text-white flex items-center justify-center border border-white shadow-sm cursor-pointer hover:bg-primary-600 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Info Section */}
                            <div className="flex-1 text-center md:text-left space-y-4">
                                <div>
                                    <h1 className="text-5xl font-bold text-gray-900 uppercase tracking-wide leading-none">{employee.name}</h1>
                                </div>

                                <div className="grid grid-cols-2 gap-x-8 gap-y-4 max-w-2xl pt-4">
                                    {[
                                        { label: 'FUNCTIONAL_ROLE', value: employee.jobDetails?.jobPosition || 'N/A' },
                                        { label: 'ASSIGNED_UNIT', value: employee.jobDetails?.department || 'N/A' },
                                        { label: 'NETWORK_EMAIL', value: employee.email },
                                        { label: 'SUPERVISOR', value: employee.jobDetails?.manager || 'UNDEFINED' }
                                    ].map((info, idx) => (
                                        <div key={idx} className="border-l-2 border-gray-200 pl-4">
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wide mb-1">{info.label}</p>
                                            <p className="text-xs font-bold text-gray-900 uppercase">{info.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Status Indicator */}
                            <div className="flex flex-col items-center gap-3">
                                <div className={`px-6 py-3 border border-gray-200 text-center shadow-sm ${employee.attendance?.some(a => new Date(a.date).toDateString() === new Date().toDateString())
                                    ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                    }`}>
                                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1">Real Time State</p>
                                    <p className="text-lg font-bold uppercase">
                                        {employee.attendance?.some(a => new Date(a.date).toDateString() === new Date().toDateString()) ? 'AUTHENTICATED' : 'DISCONNECTED'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-white border border-gray-200 mb-10 shadow-sm overflow-hidden">
                    {[
                        { id: 'resume', label: 'ABOUT', color: 'bg-primary-600' },
                        { id: 'private', label: 'CONFIDENTIAL_DATA', color: 'bg-red-600' },
                        { id: 'attendance', label: 'ATTENDANCE_CALENDAR', color: 'bg-primary-700' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 px-8 py-5 text-[10px] font-bold uppercase tracking-wider transition-all border-r last:border-r-0 border-gray-200 ${activeTab === tab.id
                                ? `text-white ${tab.color} shadow-inner`
                                : 'text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="p-8">
                    {/* About Tab (tab id stays "resume") */}
                    {activeTab === 'resume' && (() => {
                        const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : null);
                        const groups = [
                            {
                                title: 'EMPLOYEE_DETAILS',
                                fields: [
                                    { label: 'FULL_NAME', value: employee.name },
                                    { label: 'ROLE', value: employee.role },
                                    { label: 'WORK_EMAIL', value: employee.email },
                                    { label: 'PHONE', value: employee.phone },
                                    { label: 'BIOMETRIC_ID', value: employee.biometricId },
                                    { label: 'COMPANY', value: employee.company?.name },
                                    { label: 'EMAIL_VERIFIED', value: employee.emailVerified ? 'YES' : 'NO' },
                                ],
                            },
                            {
                                title: 'JOB_DETAILS',
                                fields: [
                                    { label: 'JOB_POSITION', value: employee.jobDetails?.jobPosition },
                                    { label: 'DEPARTMENT', value: employee.jobDetails?.department },
                                    { label: 'MANAGER', value: employee.manager?.name || employee.jobDetails?.manager },
                                    { label: 'WORK_LOCATION', value: employee.jobDetails?.workLocation },
                                    { label: 'DATE_OF_JOINING', value: fmtDate(employee.jobDetails?.dateOfJoining) },
                                ],
                            },
                            {
                                title: 'PERSONAL_DETAILS',
                                fields: [
                                    { label: 'DATE_OF_BIRTH', value: fmtDate(employee.profile?.dateOfBirth) },
                                    { label: 'GENDER', value: employee.profile?.gender },
                                    { label: 'MARITAL_STATUS', value: employee.profile?.maritalStatus },
                                    { label: 'NATIONALITY', value: employee.profile?.nationality },
                                    { label: 'PERSONAL_EMAIL', value: employee.profile?.personalEmail },
                                    { label: 'PARENT_NAME', value: employee.profile?.parentName },
                                    { label: 'PARENT_PHONE', value: employee.profile?.parentPhone },
                                    { label: 'RESIDING_ADDRESS', value: employee.profile?.residingAddress, fullWidth: true },
                                ],
                            },
                        ];
                        const aboutSections = [
                            { title: 'ABOUT', field: 'about', content: employee.profile?.about },
                            { title: 'WHAT_I_LOVE_ABOUT_MY_JOB', field: 'jobLoves', content: employee.profile?.jobLoves },
                            { title: 'INTERESTS_AND_HOBBIES', field: 'interestsHobbies', content: employee.profile?.interestsHobbies },
                        ];
                        return (
                            <div className="space-y-10">
                                {groups.map((group) => (
                                    <div key={group.title} className="border border-gray-200 bg-white p-8 shadow-sm">
                                        <h3 className="text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-6 underline">{group.title}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                                            {group.fields.map((f) => (
                                                <div key={f.label} className={`${f.fullWidth ? 'md:col-span-3' : ''} border-l-2 border-gray-200 pl-4`}>
                                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wide mb-1">{f.label}</p>
                                                    <p className="text-xs font-bold text-gray-900 break-words">{f.value || 'Not provided'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {isAdmin && (
                                    <div className="flex items-center justify-end gap-3">
                                        {aboutError && <p className="text-[10px] font-bold text-red-600 mr-auto">{aboutError}</p>}
                                        {editingAbout ? (
                                            <>
                                                <button
                                                    onClick={saveAbout}
                                                    disabled={aboutSaving}
                                                    className="px-6 py-2 bg-primary-700 text-white text-[10px] font-bold uppercase tracking-wide border border-gray-200 disabled:opacity-50"
                                                >
                                                    {aboutSaving ? 'SAVING...' : 'SAVE ABOUT'}
                                                </button>
                                                <button
                                                    onClick={() => setEditingAbout(false)}
                                                    disabled={aboutSaving}
                                                    className="px-6 py-2 bg-white text-gray-900 text-[10px] font-bold uppercase tracking-wide border border-gray-200"
                                                >
                                                    CANCEL
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={startEditAbout}
                                                className="px-6 py-2 bg-primary-700 text-white text-[10px] font-bold uppercase tracking-wide border border-gray-200"
                                            >
                                                EDIT ABOUT
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                    {aboutSections.map((section) => (
                                        <div key={section.title} className="border border-gray-200 bg-white p-8 shadow-sm">
                                            <h3 className="text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-4 underline">{section.title}</h3>
                                            {editingAbout ? (
                                                <textarea
                                                    value={aboutForm[section.field]}
                                                    onChange={(e) => setAboutForm((f) => ({ ...f, [section.field]: e.target.value }))}
                                                    rows={6}
                                                    maxLength={3000}
                                                    className="w-full px-3 py-2 border border-gray-200 text-xs outline-none focus:bg-gray-50"
                                                />
                                            ) : (
                                                <p className="text-xs font-bold leading-relaxed text-gray-500 whitespace-pre-line">
                                                    {section.content || 'Not provided'}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="border border-gray-200 bg-white p-8 shadow-sm">
                                    <h3 className="text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-6 underline">DOCUMENTS</h3>
                                    {employee.documents?.length ? (
                                        <div className="flex flex-col gap-3">
                                            {employee.documents.map((doc) => (
                                                <a
                                                    key={doc.id}
                                                    href={doc.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex justify-between items-center border border-gray-200 px-4 py-3 text-xs font-bold text-gray-900 hover:bg-gray-50"
                                                >
                                                    <span>{doc.fileName}</span>
                                                    <span className="text-[8px] text-gray-400 uppercase">{doc.documentType || doc.fileType}</span>
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs font-bold text-gray-500">No documents uploaded</p>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Private Info Tab */}
                    {activeTab === 'private' && (
                        <div className="border border-gray-200 bg-white shadow-sm overflow-hidden">
                            <div className="bg-primary-700 text-white px-8 py-4 flex justify-between items-center ">
                                <h3 className="text-[10px] font-bold uppercase tracking-wider">ENCRYPTED_DATABASE_RECORD // CONFIDENTIAL</h3>
                                <div className="flex gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                    <p className="text-[7px] font-bold uppercase">SECURE_CHANNEL_v4</p>
                                </div>
                            </div>
                            <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-10">
                                {[
                                    { label: 'CHRONO:DOB', value: employee.profile?.dateOfBirth ? new Date(employee.profile.dateOfBirth).toLocaleDateString() : 'N/A' },
                                    { label: 'IDENTITY:GENDER', value: employee.profile?.gender },
                                    { label: 'SOCIAL:STATUS', value: employee.profile?.maritalStatus },
                                    { label: 'GEO:NATIONALITY', value: employee.profile?.nationality },
                                    { label: 'PARENT:NAME', value: employee.profile?.parentName },
                                    { label: 'PARENT:CONTACT_NUMBER', value: employee.profile?.parentPhone },
                                    { label: 'RESIDENCE_IDENTIFIER', value: employee.profile?.residingAddress, fullWidth: true }
                                ].map((field, idx) => (
                                    <div key={idx} className={`${field.fullWidth ? 'md:col-span-3' : ''} border-b border-gray-200/10 pb-4`}>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wide mb-2">{field.label}</p>
                                        <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">{field.value || 'UNSPECIFIED'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Attendance Calendar Tab */}
                    {activeTab === 'attendance' && (
                        <MonthCalendar endpoint={`/api/admin/employees/${employee.id}/attendance`} />
                    )}

                </div>
            </main>
        </div>
    );
}
