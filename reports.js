// packages/backend/src/reports.js
export async function handleReports(request, env, ctx, user) {
  const url = new URL(request.url);
  const method = request.method;

  if (user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  // Dashboard stats
  if (method === 'GET' && url.pathname === '/api/reports/dashboard-stats') {
    return getDashboardStats(env);
  }

  // Monthly attendance report
  if (method === 'GET' && url.pathname === '/api/reports/monthly-attendance') {
    return getMonthlyAttendanceReport(request, env);
  }

  // Monthly payroll report
  if (method === 'GET' && url.pathname === '/api/reports/monthly-payroll') {
    return getMonthlyPayrollReport(request, env);
  }

  // Employee summary
  if (method === 'GET' && url.pathname === '/api/reports/employee-summary') {
    return getEmployeeSummary(request, env);
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
}

async function getDashboardStats(env) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Get total employees
    const totalEmployees = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM employees WHERE is_active = 1'
    ).first();

    // Get present today
    const presentToday = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM attendance 
      WHERE date = ? AND status = 'present'
    `).bind(today).first();

    // Get pending leaves
    const pendingLeaves = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM leave_requests 
      WHERE status = 'pending'
    `).first();

    // Get pending payroll
    const pendingPayroll = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM payroll 
      WHERE year = ? AND month = ? AND payment_status = 'pending'
    `).bind(currentYear, currentMonth).first();

    return new Response(JSON.stringify({
      success: true,
      stats: {
        totalEmployees: totalEmployees.count,
        presentToday: presentToday.count,
        pendingLeaves: pendingLeaves.count,
        pendingPayroll: pendingPayroll.count
      }
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

async function getMonthlyAttendanceReport(request, env) {
  try {
    const url = new URL(request.url);
    const year = parseInt(url.searchParams.get('year')) || new Date().getFullYear();
    const month = parseInt(url.searchParams.get('month')) || new Date().getMonth() + 1;

    const report = await env.DB.prepare(`
      SELECT 
        e.id,
        e.full_name,
        e.employee_code,
        e.position,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_days,
        COUNT(CASE WHEN a.status = 'leave' THEN 1 END) as leave_days
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id 
        AND strftime('%Y', a.date) = ? 
        AND strftime('%m', a.date) = ?
      WHERE e.is_active = 1
      GROUP BY e.id
      ORDER BY e.full_name
    `).bind(year.toString(), month.toString().padStart(2, '0')).all();

    return new Response(JSON.stringify({
      success: true,
      report: report.results
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

async function getMonthlyPayrollReport(request, env) {
  try {
    const url = new URL(request.url);
    const year = parseInt(url.searchParams.get('year')) || new Date().getFullYear();
    const month = parseInt(url.searchParams.get('month')) || new Date().getMonth() + 1;

    const report = await env.DB.prepare(`
      SELECT 
        p.*,
        e.full_name,
        e.employee_code,
        e.position
      FROM payroll p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.year = ? AND p.month = ?
      ORDER BY e.full_name
    `).bind(year, month).all();

    // Calculate totals
    const totals = report.results.reduce((acc, curr) => {
      acc.totalSalary += curr.total_salary;
      acc.totalBonus += curr.bonus_amount;
      acc.totalDeduction += curr.deduction_amount;
      return acc;
    }, { totalSalary: 0, totalBonus: 0, totalDeduction: 0 });

    return new Response(JSON.stringify({
      success: true,
      report: report.results,
      totals
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

async function getEmployeeSummary(request, env) {
  try {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');
    const year = parseInt(url.searchParams.get('year')) || new Date().getFullYear();

    if (!employeeId) {
      return new Response(JSON.stringify({ error: 'Employee ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get employee info
    const employee = await env.DB.prepare(
      'SELECT * FROM employees WHERE id = ?'
    ).bind(employeeId).first();

    // Get yearly attendance
    const attendance = await env.DB.prepare(`
      SELECT 
        strftime('%m', date) as month,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late,
        COUNT(CASE WHEN status = 'leave' THEN 1 END) as leave
      FROM attendance
      WHERE employee_id = ? AND strftime('%Y', date) = ?
      GROUP BY strftime('%m', date)
      ORDER BY month
    `).bind(employeeId, year.toString()).all();

    // Get yearly payroll
    const payroll = await env.DB.prepare(`
      SELECT month, total_salary, bonus_amount, deduction_amount
      FROM payroll
      WHERE employee_id = ? AND year = ?
      ORDER BY month
    `).bind(employeeId, year).all();

    return new Response(JSON.stringify({
      success: true,
      employee,
      attendance: attendance.results,
      payroll: payroll.results
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