import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // Required for Neon PostgreSQL
  },
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
}

// Helper to check if tables exist and create them if not
export async function initDb() {
  const createTablesQuery = `
    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      employee_id VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('employee', 'hr')),
      department VARCHAR(100) DEFAULT 'General',
      designation VARCHAR(100) DEFAULT 'Staff',
      address TEXT,
      phone VARCHAR(20),
      profile_pic TEXT,
      join_date DATE NOT NULL DEFAULT CURRENT_DATE,
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      employee_id VARCHAR(50) REFERENCES employees(employee_id) ON DELETE CASCADE,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      check_in TIMESTAMPTZ,
      check_out TIMESTAMPTZ,
      status VARCHAR(20) NOT NULL CHECK (status IN ('Present', 'Absent', 'Half Day', 'Leave')),
      UNIQUE (employee_id, date)
    );

    CREATE TABLE IF NOT EXISTS leave_requests (
      id SERIAL PRIMARY KEY,
      employee_id VARCHAR(50) REFERENCES employees(employee_id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL CHECK (type IN ('Paid', 'Sick', 'Unpaid')),
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      remarks TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
      admin_comment TEXT,
      request_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS salary_structures (
      employee_id VARCHAR(50) PRIMARY KEY REFERENCES employees(employee_id) ON DELETE CASCADE,
      base DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      hra DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      da DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      special_allowance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      lop_rate DECIMAL(12,2) NOT NULL DEFAULT 0.00
    );

    CREATE TABLE IF NOT EXISTS employee_documents (
      id SERIAL PRIMARY KEY,
      employee_id VARCHAR(50) REFERENCES employees(employee_id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      url TEXT NOT NULL,
      uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  console.log('Initializing database tables...');
  await query(createTablesQuery);
  console.log('Database tables verified/created successfully.');
}
