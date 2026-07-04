const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const argon2 = require('argon2');

// Parse .env.local
const envPath = path.join(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local file not found');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    envVars[key] = value;
  }
});

const databaseUrl = envVars.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function seed() {
  try {
    await client.connect();
    console.log('Connected to database. Creating tables...');

    // Create tables
    await client.query(`
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
    `);

    console.log('Tables created. Checking if HR Admin exists...');

    const res = await client.query("SELECT * FROM employees WHERE role = 'hr'");
    if (res.rows.length === 0) {
      console.log('No HR Admin found. Seeding initial accounts...');
      
      const adminPasswordHash = await argon2.hash('Admin@123', { type: argon2.argon2id });
      const emp1PasswordHash = await argon2.hash('Employee@123', { type: argon2.argon2id });

      // Insert HR Admin (Penny Penguin)
      await client.query(`
        INSERT INTO employees (employee_id, name, email, password, role, department, designation, phone, address, profile_pic)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, ['HR001', 'Penny Penguin', 'admin@icepenguin.in', adminPasswordHash, 'hr', 'Human Resources', 'HR Director', '+15550100', '1 Iceberg Avenue, Antarctica', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150']);

      // Insert Salary for HR Admin
      await client.query(`
        INSERT INTO salary_structures (employee_id, base, hra, da, special_allowance, lop_rate)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['HR001', 8500.00, 2500.00, 1200.00, 800.00, 300.00]);

      // Insert Test Employee (Pingu Snow)
      await client.query(`
        INSERT INTO employees (employee_id, name, email, password, role, department, designation, phone, address, profile_pic)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, ['EMP001', 'Pingu Snow', 'pingu@icepenguin.in', emp1PasswordHash, 'employee', 'Engineering', 'Software Engineer', '+15550199', '2 Glacier Road, Antarctica', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150']);

      // Insert Salary for Test Employee
      await client.query(`
        INSERT INTO salary_structures (employee_id, base, hra, da, special_allowance, lop_rate)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['EMP001', 6000.00, 1800.00, 900.00, 500.00, 200.00]);

      // Insert Test Attendance for EMP001 (Yesterday)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const checkInTime = new Date(yesterday);
      checkInTime.setHours(9, 0, 0, 0);
      const checkOutTime = new Date(yesterday);
      checkOutTime.setHours(17, 30, 0, 0);

      await client.query(`
        INSERT INTO attendance (employee_id, date, check_in, check_out, status)
        VALUES ($1, $2, $3, $4, $5)
      `, ['EMP001', yesterdayStr, checkInTime, checkOutTime, 'Present']);

      // Insert Test Leave Request
      const futureStart = new Date();
      futureStart.setDate(futureStart.getDate() + 5);
      const futureEnd = new Date();
      futureEnd.setDate(futureEnd.getDate() + 7);

      await client.query(`
        INSERT INTO leave_requests (employee_id, type, start_date, end_date, remarks, status)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['EMP001', 'Paid', futureStart.toISOString().split('T')[0], futureEnd.toISOString().split('T')[0], 'Family vacation', 'Pending']);

      console.log('Database seeded successfully!');
    } else {
      console.log('Database already has data. Skipping seed.');
    }
  } catch (err) {
    console.error('Error during database seed:', err);
  } finally {
    await client.end();
  }
}

seed();
