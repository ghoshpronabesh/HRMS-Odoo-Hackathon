import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken, verifyToken, comparePassword, hashPassword } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const token = getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'All password fields are required.' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'New password and confirm password do not match.' }, { status: 400 });
    }

    // Password complexity check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json({
        error: 'New password must be at least 8 characters, contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      }, { status: 400 });
    }

    // Get current password hash from DB
    const userRes = await query('SELECT password FROM employees WHERE employee_id = $1', [payload.employee_id]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const isMatch = await comparePassword(currentPassword, userRes.rows[0].password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Incorrect current password.' }, { status: 400 });
    }

    // Hash new password and update database
    const newHash = await hashPassword(newPassword);
    await query('UPDATE employees SET password = $1 WHERE employee_id = $2', [newHash, payload.employee_id]);

    return NextResponse.json({ success: true, message: 'Password changed successfully.' });
  } catch (error: any) {
    console.error('Change password API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
