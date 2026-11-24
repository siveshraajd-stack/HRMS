'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { StaffNameSection } from '@/components/profile/staff-name-section';

export default function AdminProfilePage() {
    const { data: session } = useSession();
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await signOut({ redirect: false });
        } finally {
            // Always land on the login page
            window.location.href = '/auth/login';
        }
    };

    return (
        <div className="min-h-screen flex">
            <AdminSidebar />
            <main className="flex-1 ml-64 p-8">
                <div className="mb-10">
                    <h1 className="text-4xl font-bold text-gray-900 uppercase tracking-tight ">HR Profile</h1>
                </div>

                <div className="border border-gray-200 bg-white shadow-sm p-10">
                    <div className="flex items-start gap-12 mb-12">
                        {/* Profile Image */}
                        <div className="relative">
                            <div className="w-40 h-40 border border-gray-200 overflow-hidden shadow-sm bg-gray-100">
                                {session?.user?.image ? (
                                    <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-300 ">
                                        {session?.user?.name?.charAt(0) || 'A'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="flex-1 space-y-6">
                            <div>
                                <h1 className="text-5xl font-bold text-gray-900 uppercase tracking-wide leading-none">{session?.user?.name || 'UNKNOWN'}</h1>
                            </div>

                            <div className="grid grid-cols-2 gap-x-8 gap-y-4 max-w-2xl pt-4">
                                {[
                                    { label: 'Email', value: session?.user?.email || 'N/A' },
                                    { label: 'Role', value: session?.user?.role || 'N/A' },
                                    { label: 'Company', value: session?.user?.companyName || 'N/A' }
                                ].map((info, idx) => (
                                    <div key={idx} className="border-l-2 border-gray-200 pl-4">
                                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wide mb-1">{info.label}</p>
                                        <p className="text-xs font-bold text-gray-900 uppercase">{info.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Name section: employees see every notification / approval as coming from this name */}
                    <div className="mb-12">
                        <StaffNameSection />
                    </div>

                    {/* Sign Out Button */}
                    <div className="border-t-2 border-gray-200 pt-8">
                        <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="px-10 py-4 bg-primary-700 text-white text-[10px] font-bold uppercase tracking-wider border border-gray-200 shadow-sm hover:shadow-none transition-all flex items-center gap-3 active:translate-x-1 active:translate-y-1"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            {loggingOut ? 'LOGGING OUT...' : 'LOG OUT'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
