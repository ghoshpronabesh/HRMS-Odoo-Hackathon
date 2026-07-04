import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken, verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify role
    const userRes = await query('SELECT role FROM employees WHERE employee_id = $1', [payload.employee_id]);
    if (userRes.rows.length === 0) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const role = userRes.rows[0].role;

    // Handle impersonation
    let targetEmployeeId = payload.employee_id;
    const impersonateHeader = req.headers.get('x-impersonate-employee');
    if (role === 'hr' && impersonateHeader) {
      targetEmployeeId = impersonateHeader;
    }

    if (role === 'hr') {
      const { searchParams } = new URL(req.url);
      const filterEmployeeId = searchParams.get('employee_id');

      if (filterEmployeeId) {
        const leaves = await query(
          'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY request_date DESC',
          [filterEmployeeId]
        );
        return NextResponse.json(leaves.rows);
      } else if (!impersonateHeader) {
        // Return all leave requests with employee details
        const leaves = await query(
          `SELECT l.*, e.name as employee_name, e.department, e.designation 
           FROM leave_requests l 
           JOIN employees e ON l.employee_id = e.employee_id 
           ORDER BY l.request_date DESC`
        );
        return NextResponse.json(leaves.rows);
      }
    }

    // Default: Get own/impersonated leaves
    const leaves = await query(
      'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY request_date DESC',
      [targetEmployeeId]
    );
    return NextResponse.json(leaves.rows);
  } catch (error) {
    console.error('Get leaves error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify role and check impersonation
    const userRes = await query('SELECT role FROM employees WHERE employee_id = $1', [payload.employee_id]);
    if (userRes.rows.length === 0) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = userRes.rows[0].role;
    let targetEmployeeId = payload.employee_id;
    const impersonateHeader = req.headers.get('x-impersonate-employee');
    if (role === 'hr' && impersonateHeader) {
      targetEmployeeId = impersonateHeader;
    }

    const body = await req.json();
    const { type, start_date, end_date, remarks } = body;

    if (!type || !start_date || !end_date) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    if (type !== 'Paid' && type !== 'Sick' && type !== 'Unpaid') {
      return NextResponse.json({ error: 'Invalid leave type' }, { status: 400 });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    
    // Reset hours to compare dates only
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);

    if (start < today) {
      return NextResponse.json({ error: 'Leave start date cannot be in the past' }, { status: 400 });
    }

    if (end < start) {
      return NextResponse.json({ error: 'Leave end date cannot be before start date' }, { status: 400 });
    }

    // Insert leave request
    await query(
      `INSERT INTO leave_requests (employee_id, type, start_date, end_date, remarks, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [targetEmployeeId, type, start_date, end_date, remarks || '', 'Pending']
    );

    return NextResponse.json({ success: true, message: 'Leave request submitted successfully' });
  } catch (error) {
    console.error('Apply leave error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
