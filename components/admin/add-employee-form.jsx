'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// The form takes one full name; the API stores first + last name.
function buildPayload(data) {
    const { fullName, ...rest } = data;
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
    return {
        ...rest,
        firstName,
        lastName,
        phone: rest.phone.trim(),
        parentName: rest.parentName.trim(),
        parentPhone: rest.parentPhone.trim(),
    };
}

export function AddEmployeeForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(null);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        maritalStatus: '',
        nationality: '',
        residingAddress: '',
        parentName: '',
        parentPhone: '',
        jobPosition: '',
        department: '',
        dateOfJoining: '',
        managerId: '',
        managerEmail: '',
        workLocation: '',
        role: 'EMPLOYEE',
        password: '',
        biometricId: '',
    });
    const [managers, setManagers] = useState([]);
    const [managersLoaded, setManagersLoaded] = useState(false);

    useEffect(() => {
        fetch('/api/admin/managers')
            .then((res) => res.json())
            .then((data) => setManagers(data.managers || []))
            .catch(() => setManagers([]))
            .finally(() => setManagersLoaded(true));
    }, []);

    const handleManagerChange = (e) => {
        const manager = managers.find((m) => m.id === e.target.value);
        // Selecting a manager fills the compulsory manager email; it can be re-checked before saving
        setFormData((prev) => ({ ...prev, managerId: e.target.value, managerEmail: manager ? manager.email : '' }));
    };

    const generatePassword = () => {
        const pick = (set) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
        const U = 'ABCDEFGHJKLMNPQRSTUVWXYZ', L = 'abcdefghijkmnpqrstuvwxyz', N = '23456789', S = '!@#$%&*?';
        const chars = [pick(U), pick(L), pick(N), pick(S)];
        while (chars.length < 12) chars.push(pick(U + L + N + S));
        for (let i = chars.length - 1; i > 0; i--) {
            const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
            [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        setFormData((prev) => ({ ...prev, password: chars.join('') }));
    };

    const validate = () => {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRe = /^[0-9]{10}$/;
        if (formData.fullName.trim().length < 2) return 'Employee name is required';
        if (!phoneRe.test(formData.phone.trim())) return 'Contact / phone number must be 10 digits';
        if (!formData.residingAddress.trim()) return 'Address is required';
        if (!formData.gender) return 'Please select a gender';
        if (!formData.dateOfBirth) return 'Date of birth is required';
        if (formData.parentName.trim().length < 2) return 'Parent name is required';
        if (!phoneRe.test(formData.parentPhone.trim())) return 'Parent number must be 10 digits';
        if (!emailRe.test(formData.email.trim())) return 'Employee email is required and must be a valid email address';
        if (!formData.managerId) return 'Please select a manager';
        if (!emailRe.test(formData.managerEmail.trim())) return "Manager's email is required and must be a valid email address";
        const pw = formData.password;
        if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw) || !/[^A-Za-z0-9]/.test(pw)) {
            return 'Temporary password needs 8+ characters with an uppercase letter, a number and a special character';
        }
        return '';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(null);

        const problem = validate();
        if (problem) {
            setError(problem);
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/admin/employees', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(buildPayload(formData)),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create employee');
            }

            setSuccess({ ...result.employee, password: formData.password });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <div className="bg-white border border-gray-200 shadow-sm p-10 mb-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-green-500 border border-gray-200 flex items-center justify-center shadow-sm">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">Entity Initialized</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Protocol validation successful</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gray-50 border border-gray-200 p-6 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2 ">Assigned System Id</p>
                            <p className="text-3xl font-bold text-primary-600 ">{success.employeeId}</p>
                        </div>
                        <div className="bg-primary-700 p-6 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 ">Temporary password (set by you)</p>
                            <p className="text-3xl font-bold text-red-500 tracking-wide">{success.password}</p>
                        </div>
                        <div className="border border-gray-200 p-4 bg-yellow-50 ">
                            <p className="text-[10px] text-gray-900 font-bold uppercase tracking-wide leading-loose">
                                <span className="text-red-600">⚠ CRITICAL:</span> Share this temporary password with the employee. They must change it on first login.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-6">
                    <button onClick={() => router.push('/admin')} className="flex-1 bg-primary-700 text-white text-[10px] font-bold py-4 border border-gray-200 uppercase tracking-wider hover:bg-white hover:text-gray-900 transition-all shadow-sm active:shadow-none">Return To Base</button>
                    <button onClick={() => window.location.reload()} className="flex-1 bg-white text-gray-900 text-[10px] font-bold py-4 border border-gray-200 uppercase tracking-wider hover:bg-gray-100 transition-all shadow-sm active:shadow-none">Initialize Another</button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-12">
            {error && (
                <div className="p-6 bg-red-600 border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-8 h-8 bg-white flex items-center justify-center font-bold text-red-600">!</div>
                    <p className="text-white text-[10px] font-bold uppercase tracking-wide ">Error: {error}</p>
                </div>
            )}

            {/* General Grid Layout for all sections */}
            <div className="space-y-12 pb-20">
                {/* Personal Information */}
                <div>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-2 h-8 bg-primary-700"></div>
                        <h3 className="text-[10px] font-bold text-gray-900 uppercase tracking-wider ">1. Personal Details (Required)</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-x-10 gap-y-8 bg-white border border-gray-200 p-10 shadow-sm">
                        {[
                            { label: 'Full Name', name: 'fullName', type: 'text', required: true, placeholder: 'First and last name' },
                            { label: 'Phone Number', name: 'phone', type: 'tel', required: true, placeholder: '10 digits', maxLength: 10 },
                            { label: 'Email', name: 'email', type: 'email', required: true },
                            { label: 'Date of Birth', name: 'dateOfBirth', type: 'date', required: true },
                            { label: 'Parent Name', name: 'parentName', type: 'text', required: true },
                            { label: 'Parent Phone Number', name: 'parentPhone', type: 'tel', required: true, placeholder: '10 digits', maxLength: 10 },
                        ].map((field) => (
                            <div key={field.name} className="space-y-2">
                                <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wide block ">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>
                                <input
                                    type={field.type}
                                    name={field.name}
                                    value={formData[field.name]}
                                    onChange={handleChange}
                                    required={field.required}
                                    placeholder={field.placeholder}
                                    maxLength={field.maxLength}
                                    className="w-full px-4 py-3 border border-gray-200 text-[10px] font-bold uppercase outline-none focus:bg-gray-50 transition-all placeholder:text-gray-200"
                                />
                            </div>
                        ))}
                        <div className="space-y-2">
                            <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wide block ">Gender <span className="text-red-500">*</span></label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border border-gray-200 text-[10px] font-bold uppercase outline-none focus:bg-gray-50 transition-all appearance-none"
                            >
                                <option value="">Select gender</option>
                                <option value="Male">MALE</option>
                                <option value="Female">FEMALE</option>
                                <option value="Other">OTHER</option>
                            </select>
                        </div>
                        <div className="space-y-2 col-span-2">
                            <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wide block ">
                                Address <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                name="residingAddress"
                                value={formData.residingAddress}
                                onChange={handleChange}
                                required
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-200 text-[10px] font-bold uppercase outline-none focus:bg-gray-50 transition-all placeholder:text-gray-200"
                            />
                        </div>
                    </div>
                </div>

                {/* Professional Information */}
                <div>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-2 h-8 bg-primary-700"></div>
                        <h3 className="text-[10px] font-bold text-gray-900 uppercase tracking-wider ">2. Job Details (Required)</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-x-10 gap-y-8 bg-white border border-gray-200 p-10 shadow-sm">
                        {[
                            { label: 'Position', name: 'jobPosition', required: true },
                            { label: 'Department', name: 'department', required: true },
                            { label: 'Joining Date (use a past date for existing employees)', name: 'dateOfJoining', type: 'date', required: true },
                        ].map((field) => (
                            <div key={field.name} className="space-y-2">
                                <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wide block ">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>
                                <input
                                    type={field.type || 'text'}
                                    name={field.name}
                                    value={formData[field.name]}
                                    onChange={handleChange}
                                    required={field.required}
                                    className="w-full px-4 py-3 border border-gray-200 text-[10px] font-bold uppercase outline-none focus:bg-gray-50 transition-all "
                                />
                            </div>
                        ))}
                        <div className="space-y-2">
                            <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wide block ">
                                Manager <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="managerId"
                                value={formData.managerId}
                                onChange={handleManagerChange}
                                required
                                className="w-full px-4 py-3 border border-gray-200 text-[10px] font-bold uppercase outline-none focus:bg-gray-50 transition-all "
                            >
                                <option value="">{managersLoaded ? 'Select manager' : 'LOADING...'}</option>
                                {managers.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name} ({m.role === 'ADMIN' ? 'HR/ADMIN' : m.role === 'TEAM_LEAD' ? 'TEAM LEAD' : 'MANAGER'})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wide block ">
                                Manager Email <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                name="managerEmail"
                                value={formData.managerEmail}
                                onChange={handleChange}
                                required
                                placeholder="manager@company.com"
                                className="w-full px-4 py-3 border border-gray-200 text-[10px] font-bold outline-none focus:bg-gray-50 transition-all placeholder:text-gray-200"
                            />
                        </div>
                    </div>
                </div>

                {/* Access credentials */}
                <div>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-2 h-8 bg-gray-400"></div>
                        <h3 className="text-[10px] font-bold text-gray-900 uppercase tracking-wider ">3. Login Details (Required)</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-x-10 gap-y-8 bg-white border border-gray-200 p-10 shadow-sm">
                        <div className="space-y-2">
                            <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wide block ">
                                Temporary Password <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    autoComplete="off"
                                    placeholder="8+ characters, capital letter, number, symbol"
                                    className="flex-1 px-4 py-3 border border-gray-200 text-[10px] font-bold outline-none focus:bg-gray-50 transition-all placeholder:text-gray-200"
                                />
                                <button type="button" onClick={generatePassword} className="px-4 border border-gray-200 text-[9px] font-bold uppercase hover:bg-primary-800 hover:text-white transition-all">
                                    Generate
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wide block ">Biometric Device ID (Optional)</label>
                            <input
                                type="text"
                                name="biometricId"
                                value={formData.biometricId}
                                onChange={handleChange}
                                maxLength={40}
                                placeholder="ID saved on the fingerprint machine"
                                className="w-full px-4 py-3 border border-gray-200 text-[10px] font-bold outline-none focus:bg-gray-50 transition-all placeholder:text-gray-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wide block ">Account Role</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-200 text-[10px] font-bold uppercase outline-none focus:bg-gray-50 transition-all "
                            >
                                <option value="EMPLOYEE">EMPLOYEE</option>
                                <option value="TEAM_LEAD">Team Lead (approves first)</option>
                                <option value="MANAGER">Manager (approves after team lead)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-700 text-white text-xs font-bold py-6 border-b-4 border-r-4 border-primary-600 uppercase tracking-wider hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all active:translate-x-1 active:translate-y-1 shadow-sm disabled:opacity-50"
                >
                    {loading ? 'Adding employee...' : 'Add Employee'}
                </button>
            </div>
        </form>
    );
}
