-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'sales', 'cashier')) NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  employee_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  position TEXT CHECK(position IN ('sales', 'cashier')) NOT NULL,
  base_salary DECIMAL(10,2) NOT NULL,
  join_date DATE NOT NULL,
  monthly_leave_days INTEGER DEFAULT 2,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Attendance records
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  status TEXT CHECK(status IN ('present', 'absent', 'late')) NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE(employee_id, date)
);

-- Leave requests
CREATE TABLE leave_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER NOT NULL,
  reason TEXT,
  status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Payroll
CREATE TABLE payroll (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  base_salary DECIMAL(10,2) NOT NULL,
  present_days INTEGER NOT NULL,
  absent_days INTEGER NOT NULL,
  leave_days INTEGER NOT NULL,
  daily_rate DECIMAL(10,2) NOT NULL,
  basic_pay DECIMAL(10,2) NOT NULL,
  deduction_amount DECIMAL(10,2) DEFAULT 0,
  bonus_amount DECIMAL(10,2) DEFAULT 0,
  total_salary DECIMAL(10,2) NOT NULL,
  payment_status TEXT CHECK(payment_status IN ('pending', 'paid')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE(employee_id, year, month)
);

-- Settings
CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT
);

-- Default settings
INSERT INTO settings (key, value) VALUES
  ('company_name', 'ကိုကိုဆိုင်'),
  ('monthly_working_days', '26'),
  ('default_leave_days', '2'),
  ('bonus_amount', '30000');
