import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken, verifyToken, hashPassword } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: targetEmployeeId } = await params;

    // Check permissions: Must be HR or the target employee themselves
    if (payload.role !== 'hr' && payload.employee_id !== targetEmployeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const employeeRes = await query(
      `SELECT id, employee_id, name, email, role, department, designation, address, phone, profile_pic, join_date, status 
       FROM employees WHERE employee_id = $1`,
      [targetEmployeeId]
    );

    if (employeeRes.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json(employeeRes.rows[0]);
  } catch (error) {
    console.error('Get employee detail error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: targetEmployeeId } = await params;

    // Check requester details
    const requesterRes = await query('SELECT role FROM employees WHERE employee_id = $1', [payload.employee_id]);
    if (requesterRes.rows.length === 0) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const requesterRole = requesterRes.rows[0].role;

    // Check permission: Must be HR or the target employee themselves
    if (requesterRole !== 'hr' && payload.employee_id !== targetEmployeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    if (requesterRole === 'hr') {
      // HR can edit all details
      const { name, email, role, department, designation, address, phone, profile_pic, status, password } = body;

      if (!name || !email || !role || !status) {
        return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
      }

      let updateQuery = `
        UPDATE employees 
        SET name = $1, email = $2, role = $3, department = $4, designation = $5, address = $6, phone = $7, profile_pic = $8, status = $9
      `;
      const paramsArray = [name, email, role, department, designation, address, phone, profile_pic, status];

      if (password && password.trim() !== '') {
        // Hashing updated password
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
          return NextResponse.json({ error: 'Password does not meet complexity requirements' }, { status: 400 });
        }
        const passwordHash = await hashPassword(password);
        updateQuery += `, password = $10 WHERE employee_id = $11`;
        paramsArray.push(passwordHash, targetEmployeeId);
      } else {
        updateQuery += ` WHERE employee_id = $10`;
        paramsArray.push(targetEmployeeId);
      }

      await query(updateQuery, paramsArray);
    } else {
      // Employee can edit only address, phone, and profile_pic
      const { address, phone, profile_pic } = body;
      await query(
        `UPDATE employees 
         SET address = $1, phone = $2, profile_pic = $3 
         WHERE employee_id = $4`,
        [address, phone, profile_pic, targetEmployeeId]
      );
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully' });
  } catch (error: any) {
    console.error('Update employee detail error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
