export async function handleAttendance(request, env, ctx, user) {
  const url = new URL(request.url);
  const method = request.method;

  // Get today's attendance
  if (method === 'GET' && url.pathname === '/api/attendance/today') {
    return getTodayAttendance(env, user);
  }

  // Get monthly attendance
  if (method === 'GET' && url.pathname === '/api/attendance/monthly') {
    return getMonthlyAttendance(request, env, user);
  }

  // Mark attendance (admin only)
  if (method === 'POST' && url.pathname === '/api/attendance') {
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
    return markAttendance(request, env);
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
}

async function getTodayAttendance(env, user) {
  const today = new Date().toISOString().split('T')[0];
  
  const attendance = await env.DB.prepare(`
    SELECT a.*, e.full_name
    FROM attendance a
    JOIN employees e ON a.employee_id = e.id
    WHERE a.employee_id = ? AND a.date = ?
  `).bind(user.employeeId, today).first();

  return new Response(JSON.stringify({
    success: true,
    attendance: attendance || null
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getMonthlyAttendance(request, env, user) {
  const url = new URL(request.url);
  const year = url.searchParams.get('year') || new Date().getFullYear();
  const month = url.searchParams.get('month') || new Date().getMonth() + 1;
  const employeeId = user.role === 'admin' 
    ? url.searchParams.get('employeeId') 
    : user.employeeId;

  const attendance = await env.DB.prepare(`
    SELECT *
    FROM attendance
    WHERE employee_id = ? 
      AND strftime('%Y', date) = ? 
      AND strftime('%m', date) = ?
    ORDER BY date
  `).bind(employeeId, year, month.toString().padStart(2, '0')).all();

  // Calculate summary
  const summary = {
    total: attendance.results.length,
    present: attendance.results.filter(a => a.status === 'present').length,
    absent: attendance.results.filter(a => a.status === 'absent').length,
    late: attendance.results.filter(a => a.status === 'late').length
  };

  return new Response(JSON.stringify({
    success: true,
    attendance: attendance.results,
    summary
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function markAttendance(request, env) {
  const { employeeId, date, status, checkIn, checkOut, notes } = await request.json();

  await env.DB.prepare(`
    INSERT INTO attendance (employee_id, date, check_in_time, check_out_time, status, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(employeeId, date, checkIn, checkOut, status, notes).run();

  return new Response(JSON.stringify({
    success: true,
    message: 'Attendance marked successfully'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}