import { NextResponse } from 'next/server';
import crypto from 'crypto';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/access';
import { errorResponseParts } from '@/lib/errors';
import { POST as createEmployee } from '../route';

export const runtime = 'nodejs';

const MAX_ROWS = 200;

// Excel column title -> field. Headers are matched ignoring case, spaces and symbols.
const COLUMNS = [
    ['fullName', 'Full Name', ['fullname', 'name', 'employeename']],
    ['email', 'Email', ['email', 'employeeemail', 'loginemail']],
    ['phone', 'Phone', ['phone', 'phonenumber', 'contact', 'contactnumber', 'mobile']],
    ['dateOfBirth', 'Date of Birth', ['dateofbirth', 'dob']],
    ['gender', 'Gender', ['gender']],
    ['maritalStatus', 'Marital Status', ['maritalstatus']],
    ['nationality', 'Nationality', ['nationality']],
    ['residingAddress', 'Address', ['address', 'residingaddress']],
    ['parentName', 'Parent Name', ['parentname']],
    ['parentPhone', 'Parent Phone', ['parentphone', 'parentnumber']],
    ['jobPosition', 'Job Position', ['jobposition', 'position', 'designation']],
    ['department', 'Department', ['department']],
    ['dateOfJoining', 'Date of Joining', ['dateofjoining', 'joiningdate', 'doj']],
    ['managerEmail', 'Manager Email', ['manageremail']],
    ['workLocation', 'Work Location', ['worklocation', 'location']],
    ['role', 'Role', ['role']],
    ['password', 'Password', ['password', 'temporarypassword']],
    ['biometricId', 'Biometric ID', ['biometricid']],
];

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function cellText(value) {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'object') {
        if (Array.isArray(value.richText)) return value.richText.map((t) => t.text).join('').trim();
        if (value.result !== undefined) return cellText(value.result);
        if (value.text !== undefined) return cellText(value.text);
        return '';
    }
    return String(value).trim();
}

function makePassword() {
    const pick = (set) => set[crypto.randomInt(set.length)];
    const U = 'ABCDEFGHJKLMNPQRSTUVWXYZ', L = 'abcdefghijkmnpqrstuvwxyz', N = '23456789', S = '!@#$%&*?';
    const chars = [pick(U), pick(L), pick(N), pick(S)];
    while (chars.length < 12) chars.push(pick(U + L + N + S));
    for (let i = chars.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
}

// GET: blank Excel template
export async function GET() {
    try {
        await requireUser({ roles: ['ADMIN'] });
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Employees');
        ws.columns = COLUMNS.map(([, title]) => ({ header: title, key: title, width: Math.max(16, title.length + 4) }));
        ws.getRow(1).font = { bold: true };
        ws.addRow({
            'Full Name': 'Arun Kumar',
            Email: 'arun.kumar@kaspl.net',
            Phone: '9876543210',
            'Date of Birth': '2001-05-14',
            Gender: 'Male',
            'Marital Status': 'Single',
            Nationality: 'Indian',
            Address: 'Chennai',
            'Parent Name': 'Kumar',
            'Parent Phone': '9876500000',
            'Job Position': 'Developer',
            Department: 'IT',
            'Date of Joining': '2026-11-20',
            'Manager Email': 'manager@kaspl.net',
            'Work Location': 'Chennai',
            Role: 'EMPLOYEE',
            Password: '',
            'Biometric ID': '',
        });
        const buffer = await wb.xlsx.writeBuffer();
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': 'attachment; filename="employees-template.xlsx"',
            },
        });
    } catch (error) {
        const [body, status] = errorResponseParts(error, 'Failed to create template');
        return NextResponse.json(body, { status });
    }
}

// POST: Excel file -> one account per row
export async function POST(request) {
    try {
        const admin = await requireUser({ roles: ['ADMIN'] });
        if (!admin.companyId) return NextResponse.json({ error: 'HR user company not found' }, { status: 400 });

        const form = await request.formData();
        const file = form.get('file');
        if (!file || typeof file === 'string') return NextResponse.json({ error: 'Choose an Excel file' }, { status: 400 });
        if (!String(file.name || '').toLowerCase().endsWith('.xlsx')) {
            return NextResponse.json({ error: 'Upload a .xlsx Excel file' }, { status: 400 });
        }

        const wb = new ExcelJS.Workbook();
        try {
            await wb.xlsx.load(Buffer.from(await file.arrayBuffer()));
        } catch {
            return NextResponse.json({ error: 'Could not read the Excel file' }, { status: 400 });
        }
        const ws = wb.worksheets[0];
        if (!ws) return NextResponse.json({ error: 'The Excel file is empty' }, { status: 400 });

        // Map header titles to fields
        const colOf = {};
        ws.getRow(1).eachCell((cell, col) => {
            const key = norm(cellText(cell.value));
            const match = COLUMNS.find(([, , aliases]) => aliases.includes(key));
            if (match && !colOf[match[0]]) colOf[match[0]] = col;
        });
        const missing = ['fullName', 'email', 'jobPosition', 'department', 'dateOfJoining', 'managerEmail']
            .filter((f) => !colOf[f])
            .map((f) => COLUMNS.find(([k]) => k === f)[1]);
        if (missing.length) {
            return NextResponse.json({ error: `Missing column title: ${missing.join(', ')}` }, { status: 400 });
        }

        const rows = [];
        ws.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const data = {};
            for (const [field] of COLUMNS) data[field] = colOf[field] ? cellText(row.getCell(colOf[field]).value) : '';
            if (Object.values(data).some(Boolean)) rows.push({ rowNumber, data });
        });
        if (!rows.length) return NextResponse.json({ error: 'No employee rows found' }, { status: 400 });
        if (rows.length > MAX_ROWS) return NextResponse.json({ error: `Maximum ${MAX_ROWS} employees at a time` }, { status: 400 });

        // Managers in this company, looked up by email
        const managers = await prisma.user.findMany({
            where: { companyId: admin.companyId, role: { in: ['TEAM_LEAD', 'MANAGER', 'ADMIN'] } },
            select: { id: true, email: true },
        });
        const managerByEmail = new Map(managers.map((m) => [m.email.toLowerCase(), m.id]));

        const results = [];
        for (const { rowNumber, data } of rows) {
            const email = data.email.toLowerCase();
            try {
                const parts = data.fullName.trim().split(/\s+/).filter(Boolean);
                const managerEmail = data.managerEmail.toLowerCase();
                const managerId = managerByEmail.get(managerEmail);
                if (!managerId) throw new Error(`Manager not found: ${data.managerEmail || '(blank)'}`);
                const role = data.role ? data.role.trim().toUpperCase().replace(/[\s-]+/g, '_') : 'EMPLOYEE';
                const password = data.password || makePassword();

                const payload = {
                    firstName: parts[0] || '',
                    lastName: parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || '',
                    email,
                    password,
                    role,
                    managerId,
                    managerEmail,
                    jobPosition: data.jobPosition,
                    department: data.department,
                    dateOfJoining: data.dateOfJoining,
                    biometricId: data.biometricId,
                    phone: data.phone.replace(/\s+/g, ''),
                    dateOfBirth: data.dateOfBirth || undefined,
                    gender: data.gender || undefined,
                    maritalStatus: data.maritalStatus || undefined,
                    nationality: data.nationality || undefined,
                    residingAddress: data.residingAddress || undefined,
                    parentName: data.parentName,
                    parentPhone: data.parentPhone.replace(/\s+/g, ''),
                    workLocation: data.workLocation || undefined,
                };

                // Same validation and creation as the single "Add Employee" form
                const res = await createEmployee(
                    new Request('http://localhost/api/admin/employees', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    })
                );
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || 'Failed');
                results.push({ row: rowNumber, name: data.fullName, email, ok: true, employeeId: json.employee?.employeeId, password });
            } catch (err) {
                results.push({ row: rowNumber, name: data.fullName, email, ok: false, error: err.message });
            }
        }

        const created = results.filter((r) => r.ok).length;
        return NextResponse.json({ created, failed: results.length - created, results }, { status: 200 });
    } catch (error) {
        const [body, status] = errorResponseParts(error, 'Bulk upload failed');
        return NextResponse.json(body, { status });
    }
}
