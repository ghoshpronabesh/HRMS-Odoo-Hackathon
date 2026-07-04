import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password, isGoogle } = await req.json();

    if (!isGoogle && (!email || !password)) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (isGoogle && !email) {
      return NextResponse.json({ error: 'Google email is required' }, { status: 400 });
    }

    // Find employee
    const res = await query('SELECT * FROM employees WHERE email = $1', [email]);
    if (res.rows.length === 0) {
      return NextResponse.json({ 
        error: isGoogle 
          ? 'No employee account found for this Google email. Please request your HR administrator to register you first.' 
          : 'Incorrect Email or Password' 
      }, { status: 401 });
    }

    const employee = res.rows[0];

    // Check status
    if (employee.status !== 'active') {
      return NextResponse.json({ error: 'Your account is deactivated' }, { status: 403 });
    }

    // Verify password if not Google login
    if (!isGoogle) {
      const isPasswordValid = await comparePassword(password, employee.password);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Incorrect Email or Password' }, { status: 401 });
      }
    }

    // Sign session token
    const token = signToken({
      employee_id: employee.employee_id,
      email: employee.email,
      role: employee.role
    });

    const response = NextResponse.json({
      success: true,
      user: {
        employee_id: employee.employee_id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        profile_pic: employee.profile_pic
      }
    });

    // Set cookie
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 1 day
    });

    return response;
  } catch (error: any) {
    console.error('Sign in error:', error);
    return NextResponse.json({ error: 'Server error during sign in' }, { status: 500 });
  }
}
