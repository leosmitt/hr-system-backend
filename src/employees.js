export async function handleEmployees(request, env, ctx, user) {
  const url = new URL(request.url);
  const method = request.method;

  // GET all employees (admin only)
  if (method === 'GET' && url.pathname === '/api/employees') {
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
    return getEmployees(env);
  }

  // GET single employee
  if (method === 'GET' && url.pathname.match(/\/api\/employees\/\d+/)) {
    const id = url.pathname.split('/').pop();
    return getEmployee(env, id);
  }

  // POST new employee (admin only)
  if (method === 'POST' && url.pathname === '/api/employees') {
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
    return createEmployee(request, env);
  }

  // PUT update employee (admin only)
  if (method === 'PUT' && url.pathname.match(/\/api\/employees\/\d+/)) {
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
    const id = url.pathname.split('/').pop();
    return updateEmployee(request, env, id);
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
}

async function getEmployees(env) {
  const employees = await env.DB.prepare(`
    SELECT e.*, u.username, u.role, u.is_active
    FROM employees e
    JOIN users u ON e.user_id = u.id
    ORDER BY e.id
  `).all();

  return new Response(JSON.stringify({
    success: true,
    employees: employees.results
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getEmployee(env, id) {
  const employee = await env.DB.prepare(`
    SELECT e.*, u.username, u.role, u.is_active
    FROM employees e
    JOIN users u ON e.user_id = u.id
    WHERE e.id = ?
  `).bind(id).first();

  if (!employee) {
    return new Response(JSON.stringify({ error: 'Employee not found' }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    employee
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function createEmployee(request, env) {
  const data = await request.json();
  
  // Start transaction
  const result = await env.DB.prepare(`
    INSERT INTO users (username, password_hash, role)
    VALUES (?, ?, ?)
    RETURNING id
  `).bind(data.username, 'dummy-hash', data.role).run();

  const userId = result.results[0].id;

  await env.DB.prepare(`
    INSERT INTO employees (user_id, employee_code, full_name, phone, position, base_salary, join_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    userId, 
    data.employeeCode, 
    data.fullName, 
    data.phone, 
    data.position, 
    data.baseSalary, 
    data.joinDate || new Date().toISOString().split('T')[0]
  ).run();

  return new Response(JSON.stringify({
    success: true,
    message: 'Employee created successfully'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function updateEmployee(request, env, id) {
  const data = await request.json();
  
  await env.DB.prepare(`
    UPDATE employees 
    SET full_name = ?, phone = ?, position = ?, base_salary = ?
    WHERE id = ?
  `).bind(data.fullName, data.phone, data.position, data.baseSalary, id).run();

  return new Response(JSON.stringify({
    success: true,
    message: 'Employee updated successfully'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}