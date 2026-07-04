import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken, verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = getSessionToken(req);
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Fetch user details from database
    const res = await query(
      'SELECT id, employee_id, name, email, role, department, designation, address, phone, profile_pic, join_date, status FROM employees WHERE employee_id = $1',
      [payload.employee_id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = res.rows[0];
    
    // Check if user is active
    if (user.status !== 'active') {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    // Support impersonation header for HR/Admin users
    const impersonateHeader = req.headers.get('x-impersonate-employee');
    if (impersonateHeader && user.role === 'hr') {
      const impRes = await query(
        'SELECT id, employee_id, name, email, role, department, designation, address, phone, profile_pic, join_date, status FROM employees WHERE employee_id = $1',
        [impersonateHeader]
      );
      if (impRes.rows.length > 0) {
        return NextResponse.json({
          authenticated: true,
          user: impRes.rows[0],
          impersonating: true,
          adminUser: user
        });
      }
    }

    return NextResponse.json({
      authenticated: true,
      user,
      impersonating: false
    });
  } catch (error) {
    console.error('Check auth error:', error);
    return NextResponse.json({ error: 'Server error during authentication check' }, { status: 500 });
  }
}
