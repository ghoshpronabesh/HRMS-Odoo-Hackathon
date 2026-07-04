import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken, verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function PUT(req: NextRequest) {
  try {
    const token = getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify requesting user role is HR
    const userRes = await query('SELECT role FROM employees WHERE employee_id = $1', [payload.employee_id]);
    if (userRes.rows.length === 0 || userRes.rows[0].role !== 'hr') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { id, status, admin_comment } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Leave ID and Status are required' }, { status: 400 });
    }

    if (status !== 'Approved' && status !== 'Rejected') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get the leave request details first
    const leaveRes = await query('SELECT * FROM leave_requests WHERE id = $1', [id]);
    if (leaveRes.rows.length === 0) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    const leaveRequest = leaveRes.rows[0];

    // Update leave request status
    await query(
      `UPDATE leave_requests 
       SET status = $1, admin_comment = $2 
       WHERE id = $3`,
      [status, admin_comment || '', id]
    );

    // If approved, automatically update attendance logs for those dates
    if (status === 'Approved') {
      const empId = leaveRequest.employee_id;
      const start = new Date(leaveRequest.start_date);
      const end = new Date(leaveRequest.end_date);

      // Loop through all dates between start and end inclusive
      const current = new Date(start);
      while (current <= end) {
        // Adjust timezone offset to get YYYY-MM-DD in local time
        const offset = current.getTimezoneOffset();
        const currentLocal = new Date(current.getTime() - (offset * 60 * 1000));
        const dateStr = currentLocal.toISOString().split('T')[0];

        // Insert or update attendance status for this date
        await query(`
          INSERT INTO attendance (employee_id, date, status)
          VALUES ($1, $2, $3)
          ON CONFLICT (employee_id, date) 
          DO UPDATE SET status = $3, check_in = NULL, check_out = NULL
        `, [empId, dateStr, 'Leave']);

        // Increment current date
        current.setDate(current.getDate() + 1);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Leave request has been ${status.toLowerCase()}` 
    });
  } catch (error) {
    console.error('Approve leave error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
