import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken, verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function PUT(req: NextRequest) {
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
    const { employee_id, base, hra, da, special_allowance, lop_rate } = body;

    if (!employee_id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Insert or update salary structure (Base, HRA, DA, SpecialAllowance, LOPRate)
    await query(`
      INSERT INTO salary_structures (employee_id, base, hra, da, special_allowance, lop_rate)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (employee_id) 
      DO UPDATE SET base = $2, hra = $3, da = $4, special_allowance = $5, lop_rate = $6
    `, [employee_id, base || 0, hra || 0, da || 0, special_allowance || 0, lop_rate || 0]);

    return NextResponse.json({ success: true, message: 'Salary structure updated successfully' });
  } catch (error) {
    console.error('Update payroll error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
