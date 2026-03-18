// packages/backend/src/payroll.js
import { getSettings } from './settings.js';

export async function handlePayroll(request, env, ctx, user) {
  const url = new URL(request.url);
  const method = request.method;

  // Get my payroll
  if (method === 'GET' && url.pathname === '/api/payroll/my') {
    return getMyPayroll(request, env, user);
  }

  // Calculate payroll (admin only)
  if (method === 'POST' && url.pathname === '/api/payroll/calculate') {
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
    return calculatePayroll(request, env);
  }

  // Get all payroll (admin only)
  if (method === 'GET' && url.pathname === '/api/payroll') {
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
    return getAllPayroll(request, env);
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
}

async function getMyPayroll(request, env, user) {
  try {
    const url = new URL(request.url);
    const year = parseInt(url.searchParams.get('year')) || new Date().getFullYear();
    const month = parseInt(url.searchParams.get('month')) || new Date().getMonth() + 1;

    const payroll = await env.DB.prepare(`
      SELECT p.*, e.full_name, e.employee_code
      FROM payroll p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.employee_id = ? AND p.year = ? AND p.month = ?
    `).bind(user.employeeId, year, month).first();

    return new Response(JSON.stringify({
      success: true,
      payroll: payroll || null
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function calculatePayroll(request, env) {
  try {
    const { year, month, employeeId } = await request.json();

    // Get settings
    const settings = await getSettings(env);
    const monthlyWorkingDays = parseInt(settings.monthly_working_days) || 26;
    const allowedLeaves = parseInt(settings.default_leave_days) || 2;
    const bonusAmount = parseInt(settings.bonus_amount) || 30000;

    let employees = [];

    if (employeeId) {
      const emp = await env.DB.prepare('SELECT * FROM employees WHERE id = ?').bind(employeeId).first();
      if (emp) employees = [emp];
    } else {
      const result = await env.DB.prepare('SELECT * FROM employees WHERE is_active = 1').all();
      employees = result.results;
    }

    const results = [];

    for (const emp of employees) {
      // Get attendance for the month
      const attendance = await env.DB.prepare(`
        SELECT * FROM attendance 
        WHERE employee_id = ? 
          AND strftime('%Y', date) = ? 
          AND strftime('%m', date) = ?
      `).bind(emp.id, year.toString(), month.toString().padStart(2, '0')).all();

      const presentDays = attendance.results.filter(a => a.status === 'present').length;
      const absentDays = attendance.results.filter(a => a.status === 'absent').length;
      const leaveDays = attendance.results.filter(a => a.status === 'leave').length;

      // Calculate daily rate
      const dailyRate = emp.base_salary / monthlyWorkingDays;

      // Calculate basic pay
      const basicPay = presentDays * dailyRate;

      // Calculate deduction (if absent > allowed leaves)
      const totalAbsent = absentDays + leaveDays;
      const excessDays = Math.max(0, totalAbsent - allowedLeaves);
      const deductionAmount = excessDays * dailyRate;

      // Calculate bonus (if absent + leave <= allowedLeaves)
      const bonusEligible = totalAbsent <= allowedLeaves;
      const bonus = bonusEligible ? bonusAmount : 0;

      // Calculate total salary
      const totalSalary = basicPay - deductionAmount + bonus;

      // Save to database
      await env.DB.prepare(`
        INSERT INTO payroll (
          employee_id, year, month, base_salary,
          present_days, absent_days, leave_days,
          daily_rate, basic_pay, deduction_amount, bonus_amount, total_salary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(employee_id, year, month) DO UPDATE SET
          present_days = excluded.present_days,
          absent_days = excluded.absent_days,
          leave_days = excluded.leave_days,
          daily_rate = excluded.daily_rate,
          basic_pay = excluded.basic_pay,
          deduction_amount = excluded.deduction_amount,
          bonus_amount = excluded.bonus_amount,
          total_salary = excluded.total_salary,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        emp.id, year, month, emp.base_salary,
        presentDays, absentDays, leaveDays,
        dailyRate, basicPay, deductionAmount, bonus, totalSalary
      ).run();

      results.push({
        employeeId: emp.id,
        employeeName: emp.full_name,
        presentDays,
        absentDays,
        leaveDays,
        basicPay,
        deductionAmount,
        bonus,
        totalSalary
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'လစာတွက်ပြီးပါပြီ',
      results
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getAllPayroll(request, env) {
  try {
    const url = new URL(request.url);
    const year = parseInt(url.searchParams.get('year')) || new Date().getFullYear();
    const month = parseInt(url.searchParams.get('month')) || new Date().getMonth() + 1;

    const payrolls = await env.DB.prepare(`
      SELECT p.*, e.full_name, e.employee_code, e.position
      FROM payroll p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.year = ? AND p.month = ?
      ORDER BY e.full_name
    `).bind(year, month).all();

    return new Response(JSON.stringify({
      success: true,
      payrolls: payrolls.results
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}