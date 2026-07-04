import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ice-penguin-hrms-secret-key-2026-hackathon';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employee_id, name, email, password, role, verification_code, verification_token } = body;

    // Phase 1: Initial submission (No verification code)
    if (!verification_code) {
      // Validations
      if (!employee_id || !name || !email || !password || !role) {
        return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
      }

      if (role !== 'employee' && role !== 'hr') {
        return NextResponse.json({ error: 'Invalid role selected' }, { status: 400 });
      }

      // Password complexity check
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        return NextResponse.json({
          error: 'Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
        }, { status: 400 });
      }

      // Check if employee already exists
      const checkEmp = await query('SELECT id FROM employees WHERE employee_id = $1 OR email = $2', [employee_id, email]);
      if (checkEmp.rows.length > 0) {
        return NextResponse.json({ error: 'Employee ID or Email already registered' }, { status: 400 });
      }

      // Generate a mock 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`[VERIFICATION EMAIL SENT] To: ${email}, OTP Code: ${otp}`);

      // Hash password
      const passwordHash = await hashPassword(password);

      // Sign a temporary verification token containing all details plus the OTP
      const tempToken = jwt.sign(
        { employee_id, name, email, passwordHash, role, otp },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      return NextResponse.json({
        otp_required: true,
        verification_token: tempToken,
        dev_otp: otp, // Returned for testing purposes in UI
        message: 'Verification code sent to ' + email
      });
    }

    // Phase 2: Code verification
    if (!verification_token) {
      return NextResponse.json({ error: 'Verification token is missing' }, { status: 400 });
    }

    let payload: any;
    try {
      payload = jwt.verify(verification_token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ error: 'Verification session expired. Please sign up again.' }, { status: 400 });
    }

    if (payload.otp !== verification_code) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    // Check one last time before inserting to avoid race conditions
    const finalCheck = await query('SELECT id FROM employees WHERE employee_id = $1 OR email = $2', [payload.employee_id, payload.email]);
    if (finalCheck.rows.length > 0) {
      return NextResponse.json({ error: 'Employee ID or Email already registered' }, { status: 400 });
    }

    // Insert employee into DB
    await query(`
      INSERT INTO employees (employee_id, name, email, password, role)
      VALUES ($1, $2, $3, $4, $5)
    `, [payload.employee_id, payload.name, payload.email, payload.passwordHash, payload.role]);

    // Initialize salary structure to defaults (Base, HRA, DA, SpecialAllowance, LOPRate)
    await query(`
      INSERT INTO salary_structures (employee_id, base, hra, da, special_allowance, lop_rate)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [payload.employee_id, 4000.00, 1200.00, 600.00, 400.00, 150.00]);

    return NextResponse.json({ success: true, message: 'Account verified and created successfully' });
  } catch (error: any) {
    console.error('Sign up error:', error);
    return NextResponse.json({ error: error.message || 'Server error during sign up' }, { status: 500 });
  }
}
