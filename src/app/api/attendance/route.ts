import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken, verifyToken } from '@/lib/auth';
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
    
    const role = userRes.rows[0].role;

    // Handle impersonation
    let targetEmployeeId = payload.employee_id;
    const impersonateHeader = req.headers.get('x-impersonate-employee');
    
    if (role === 'hr' && impersonateHeader) {
      targetEmployeeId = impersonateHeader;
    }

    const { searchParams } = new URL(req.url);
    const filterEmployeeId = searchParams.get('employee_id');

    if (role === 'hr') {
      if (filterEmployeeId) {
        // Fetch specific employee attendance (direct filter)
        const attendance = await query(
          'SELECT * FROM attendance WHERE employee_id = $1 ORDER BY date DESC',
          [filterEmployeeId]
        );
        return NextResponse.json(attendance.rows);
      } else if (!impersonateHeader) {
        // Fetch all attendance records with employee details
        const attendance = await query(
          `SELECT a.*, e.name as employee_name, e.department, e.designation 
           FROM attendance a 
           JOIN employees e ON a.employee_id = e.employee_id 
           ORDER BY a.date DESC, a.check_in DESC`
        );
        return NextResponse.json(attendance.rows);
      }
    }

    // Default: Fetch own/impersonated attendance
    const attendance = await query(
      'SELECT * FROM attendance WHERE employee_id = $1 ORDER BY date DESC',
      [targetEmployeeId]
    );
    return NextResponse.json(attendance.rows);
  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
