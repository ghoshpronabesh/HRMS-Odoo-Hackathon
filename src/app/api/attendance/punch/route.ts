import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken, verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const token = getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify requesting user role & check impersonation
    const userRes = await query('SELECT role FROM employees WHERE employee_id = $1', [payload.employee_id]);
    if (userRes.rows.length === 0) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const role = userRes.rows[0].role;
    let targetEmployeeId = payload.employee_id;
    const impersonateHeader = req.headers.get('x-impersonate-employee');
    
    if (role === 'hr' && impersonateHeader) {
      targetEmployeeId = impersonateHeader;
    }

    const body = await req.json();
    const { action } = body; // 'in' or 'out'

    if (action !== 'in' && action !== 'out') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Use absolute local date representation YYYY-MM-DD
    const localDate = new Date();
    const offset = localDate.getTimezoneOffset();
    const localDateAdjusted = new Date(localDate.getTime() - (offset * 60 * 1000));
    const todayStr = localDateAdjusted.toISOString().split('T')[0];
    const now = new Date();

    // Check check-in status
    const existingPunch = await query(
      'SELECT * FROM attendance WHERE employee_id = $1 AND date = $2',
      [targetEmployeeId, todayStr]
    );

    if (action === 'in') {
      if (existingPunch.rows.length > 0) {
        return NextResponse.json({ error: 'Already checked in today' }, { status: 400 });
      }

      // Check-in
      await query(
        `INSERT INTO attendance (employee_id, date, check_in, status)
         VALUES ($1, $2, $3, $4)`,
        [targetEmployeeId, todayStr, now, 'Present']
      );

      return NextResponse.json({ success: true, message: 'Checked in successfully', check_in: now });
    } else {
      // action === 'out'
      if (existingPunch.rows.length === 0) {
        return NextResponse.json({ error: 'No check-in record found for today' }, { status: 400 });
      }

      const punchRecord = existingPunch.rows[0];
      if (!punchRecord.check_in) {
        return NextResponse.json({ error: 'No check-in record found for today' }, { status: 400 });
      }
      if (punchRecord.check_out) {
        return NextResponse.json({ error: 'Already checked out today' }, { status: 400 });
      }

      const checkInTime = new Date(punchRecord.check_in);
      const diffMs = now.getTime() - checkInTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Determine status based on hours worked
      let finalStatus = 'Present';
      if (diffHours < 4) {
        finalStatus = 'Half Day';
      }

      await query(
        `UPDATE attendance 
         SET check_out = $1, status = $2 
         WHERE employee_id = $3 AND date = $4`,
        [now, finalStatus, targetEmployeeId, todayStr]
      );

      return NextResponse.json({ 
        success: true, 
        message: 'Checked out successfully', 
        check_out: now, 
        hours_worked: diffHours.toFixed(2),
        status: finalStatus
      });
    }
  } catch (error) {
    console.error('Punch attendance error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
