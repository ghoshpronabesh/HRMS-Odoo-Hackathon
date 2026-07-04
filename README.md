# 🐧 Ice Penguin HR (Enterprise HRMS Portal)

Ice Penguin HR is a premium, state-of-the-art Enterprise Human Resource Management System (HRMS) designed for modern workplaces. Built on a performant, high-contrast, glassmorphic layout, it delivers robust dashboard statistics, attendance tracking, leave request processing, payroll configuration, and secure credential management.

---

## 🚀 Key Features

### 1. Unified Authentication & Access Control
- Secure **JWT Cookie-based session tokens** with absolute authentication boundaries.
- **Two-phase registration** featuring mock OTP generation and email validation logging.
- Role-based permissions (**HR Administrator** vs. **Staff Employee**).

### 2. Impersonation System (HR Admin Console)
- HR administrators can view the dashboard **as any registered employee** in real-time.
- Punches, leave filings, and payslip downloads seamlessly execute under the target employee's context.

### 3. Shift Console & Timezone-Correct Attendance
- Dynamic live clock rendering in a **12-hour AM/PM format**.
- Start/stop shifts using check-in and check-out triggers.
- Fully immune to UTC date-splitting shifts using browser local timezone extraction methods.

### 4. Interactive Calendars & Visual Cues
- Elegant **Monthly Calendar Grid** highlighting daily statuses with distinct color badges (`Present`, `Absent`, `Half Day`, `Leave`).
- Status metrics linking directly to relevant panels with modern elevation hover transitions.

### 5. Leave & Approval Portal
- Submit leave requests specifying types (Paid, Sick, Unpaid) and date ranges.
- Full-page **portal-mounted confirmation dialogs** with deep backdrop blurs (`8px`) for premium visual focus.
- Dynamic calculation of available balances based on approved or pending requests.

### 6. Interactive Payroll & Payslip Configuration
- Dedicated salary adjustment subroutes (`/payroll/edit?employee_id=...`) to manage Base Pay, HRA, DA, Special Allowances, and LOP rates.
- Elegant **Net Monthly Payout** card styled with a premium dark gradient and soft cyan glows.
- Custom-branded **printable payslips** complete with the corporate logo, metadata, and tables ready for print formatting.

### 7. Self-Service Account Security
- Self-service change password panel (`/profile/change-password`) with visibility toggles (**Eye / EyeOff** icons) to manage credential security.
- Enforces strict password complexity rules.

---

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Client Components, Server Actions)
- **Database**: PostgreSQL (Raw SQL queries with ssl pooling via `pg`)
- **Styling**: CSS Variables, Glassmorphic Glass-Panels, Responsive CSS Grid system
- **Icons**: [Lucide React](https://lucide.dev/)
- **Hashing**: Argon2id & bcryptjs fallback

---

## 📂 Database Schema

The PostgreSQL database contains the following tables:

### `employees`
- `employee_id` (VARCHAR, Primary Key)
- `name` (VARCHAR)
- `email` (VARCHAR, Unique)
- `password` (VARCHAR)
- `role` (VARCHAR) - `employee` or `hr`
- `department` (VARCHAR)
- `designation` (VARCHAR)
- `address` (VARCHAR)
- `phone` (VARCHAR)
- `profile_pic` (VARCHAR)
- `join_date` (TIMESTAMP, default NOW())
- `status` (VARCHAR) - `active` or `inactive`

### `attendance`
- `id` (SERIAL, Primary Key)
- `employee_id` (VARCHAR, Foreign Key -> `employees`)
- `date` (DATE)
- `check_in` (TIMESTAMP)
- `check_out` (TIMESTAMP, Nullable)
- `status` (VARCHAR) - `Present`, `Absent`, `Half Day`, `Leave`

### `salary_structures`
- `employee_id` (VARCHAR, Primary Key, Foreign Key -> `employees`)
- `base` (NUMERIC)
- `hra` (NUMERIC)
- `da` (NUMERIC)
- `special_allowance` (NUMERIC)
- `lop_rate` (NUMERIC)

### `leave_requests`
- `id` (SERIAL, Primary Key)
- `employee_id` (VARCHAR, Foreign Key -> `employees`)
- `start_date` (DATE)
- `end_date` (DATE)
- `type` (VARCHAR) - `Paid`, `Sick`, `Unpaid`
- `reason` (TEXT)
- `status` (VARCHAR) - `Pending`, `Approved`, `Rejected`

---

## ⚙️ Installation & Local Setup

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed.

### 2. Environment Variables
Create a `.env.local` file in the root directory:
```env
DATABASE_URL=postgres://<username>:<password>@<host>:<port>/<dbname>?sslmode=require
JWT_SECRET=your-jwt-secret-key
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Seed Database
Initialize database tables and seed test accounts (Pronabesh Ghosh - HR Director, Koyel Pal - Software Engineer):
```bash
node scripts/seed.js
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the application.

---

## 📦 Deployment & Production Build

To compile a highly optimized static/dynamic production build, execute:
```bash
npm run build
```
To run the production bundle locally:
```bash
npm run start
```

---

## 🎨 Design Systems
- **Responsive Layout System**: CSS Grid classes (`responsive-grid-1-1`, `responsive-grid-2-3`, etc.) automatically adapt to fit layout content columns side-by-side on desktops, collapsing neatly to a single column on mobile screen boundaries.
- **Glassmorphic Glass-panels**: Glow styling overlays featuring transparent border lines, blur filters, and dark drop shadows.
