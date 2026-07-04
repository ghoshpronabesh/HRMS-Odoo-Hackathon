import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken, verifyToken, hashPassword } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify requesting user role
    const userRes = await query('SELECT role FROM employees WHERE employee_id = $1', [payload.employee_id]);
    if (userRes.rows.length === 0) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const requesterRole = userRes.rows[0].role;
    if (requesterRole !== 'hr') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all employees (exclude passwords)
    const employeesRes = await query(
      'SELECT id, employee_id, name, email, role, department, designation, address, phone, profile_pic, join_date, status FROM employees ORDER BY employee_id ASC'
    );

    return NextResponse.json(employeesRes.rows);
  } catch (error) {
    console.error('Get employees error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify requesting user is HR
    const userRes = await query('SELECT role FROM employees WHERE employee_id = $1', [payload.employee_id]);
    if (userRes.rows.length === 0 || userRes.rows[0].role !== 'hr') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { employee_id, name, email, password, role, department, designation, address, phone, profile_pic } = body;

    if (!employee_id || !name || !email || !password || !role) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    // Check password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json({ error: 'Password does not meet complexity requirements' }, { status: 400 });
    }

    // Check if employee exists
    const checkEmp = await query('SELECT id FROM employees WHERE employee_id = $1 OR email = $2', [employee_id, email]);
    if (checkEmp.rows.length > 0) {
      return NextResponse.json({ error: 'Employee ID or Email already exists' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    // Insert employee
    await query(`
      INSERT INTO employees (employee_id, name, email, password, role, department, designation, address, phone, profile_pic)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [employee_id, name, email, passwordHash, role, department || 'General', designation || 'Staff', address || '', phone || '', profile_pic || '']);

    // Initialize salary structure
    await query(`
      INSERT INTO salary_structures (employee_id, base, hra, da, special_allowance, lop_rate)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [employee_id, 4000.00, 1200.00, 600.00, 400.00, 150.00]);

    return NextResponse.json({ success: true, message: 'Employee registered successfully' });
  } catch (error: any) {
    console.error('Create employee error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
