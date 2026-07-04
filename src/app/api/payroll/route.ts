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

    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    if (role === 'hr' && !impersonateHeader) {
      // HR gets all payroll records
      const payrollRes = await query(`
        SELECT s.*, e.name as employee_name, e.department, e.designation, e.email, e.status as employee_status
        FROM salary_structures s
        JOIN employees e ON s.employee_id = e.employee_id
        ORDER BY s.employee_id ASC
      `);

      // Fetch attendance stats for each employee for this month to calculate LOP/deductions
      const payrollData = [];
      for (const structure of payrollRes.rows) {
        const empId = structure.employee_id;

        // Count absent days in current month
        const absentCountRes = await query(
          `SELECT COUNT(*) FROM attendance 
           WHERE employee_id = $1 AND date BETWEEN $2 AND $3 AND status = 'Absent'`,
          [empId, startOfMonth, endOfMonth]
        );
        const absentCount = parseInt(absentCountRes.rows[0].count);

        // Count approved unpaid leaves in current month
        const unpaidLeaveRes = await query(
          `SELECT start_date, end_date FROM leave_requests 
           WHERE employee_id = $1 AND type = 'Unpaid' AND status = 'Approved' 
           AND (start_date <= $3 AND end_date >= $2)`,
          [empId, startOfMonth, endOfMonth]
        );

        let unpaidDays = 0;
        unpaidLeaveRes.rows.forEach(leave => {
          const start = new Date(Math.max(new Date(leave.start_date).getTime(), new Date(startOfMonth).getTime()));
          const end = new Date(Math.min(new Date(leave.end_date).getTime(), new Date(endOfMonth).getTime()));
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          unpaidDays += diffDays;
        });

        const base = parseFloat(structure.base);
        const hra = parseFloat(structure.hra);
        const da = parseFloat(structure.da);
        const special_allowance = parseFloat(structure.special_allowance);
        const lop_rate = parseFloat(structure.lop_rate);

        const gross = base + hra + da + special_allowance;
        const deductions = (absentCount + unpaidDays) * lop_rate;
        const net = Math.max(0, gross - deductions);

        payrollData.push({
          ...structure,
          base, hra, da, special_allowance, lop_rate,
          absent_days: absentCount,
          unpaid_leave_days: unpaidDays,
          gross_salary: gross,
          deductions,
          net_salary: net
        });
      }

      return NextResponse.json(payrollData);
    }

    // Fetch for individual employee (or impersonated)
    const salaryRes = await query(
      'SELECT * FROM salary_structures WHERE employee_id = $1',
      [targetEmployeeId]
    );

    if (salaryRes.rows.length === 0) {
      return NextResponse.json({ error: 'Salary structure not found' }, { status: 404 });
    }

    const structure = salaryRes.rows[0];

    // Count absent days in current month
    const absentCountRes = await query(
      `SELECT COUNT(*) FROM attendance 
       WHERE employee_id = $1 AND date BETWEEN $2 AND $3 AND status = 'Absent'`,
      [targetEmployeeId, startOfMonth, endOfMonth]
    );
    const absentCount = parseInt(absentCountRes.rows[0].count);

    // Count approved unpaid leaves
    const unpaidLeaveRes = await query(
      `SELECT start_date, end_date FROM leave_requests 
       WHERE employee_id = $1 AND type = 'Unpaid' AND status = 'Approved' 
       AND (start_date <= $3 AND end_date >= $2)`,
      [targetEmployeeId, startOfMonth, endOfMonth]
    );

    let unpaidDays = 0;
    unpaidLeaveRes.rows.forEach(leave => {
      const start = new Date(Math.max(new Date(leave.start_date).getTime(), new Date(startOfMonth).getTime()));
      const end = new Date(Math.min(new Date(leave.end_date).getTime(), new Date(endOfMonth).getTime()));
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      unpaidDays += diffDays;
    });

    const base = parseFloat(structure.base);
    const hra = parseFloat(structure.hra);
    const da = parseFloat(structure.da);
    const special_allowance = parseFloat(structure.special_allowance);
    const lop_rate = parseFloat(structure.lop_rate);

    const gross = base + hra + da + special_allowance;
    const deductions = (absentCount + unpaidDays) * lop_rate;
    const net = Math.max(0, gross - deductions);

    return NextResponse.json({
      ...structure,
      base, hra, da, special_allowance, lop_rate,
      absent_days: absentCount,
      unpaid_leave_days: unpaidDays,
      gross_salary: gross,
      deductions,
      net_salary: net,
      period: now.toLocaleString('default', { month: 'long', year: 'numeric' })
    });
  } catch (error) {
    console.error('Get payroll error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
