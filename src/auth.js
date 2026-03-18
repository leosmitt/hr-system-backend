export async function handleAuth(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/auth/login' && request.method === 'POST') {
    return handleLogin(request, env);
  }
  if (path === '/api/auth/logout' && request.method === 'POST') {
    return handleLogout(request, env);
  }
  if (path === '/api/auth/me' && request.method === 'GET') {
    return handleGetMe(request, env);
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
}

async function handleLogin(request, env) {
  try {
    const { username, password } = await request.json();

    // Get user from database
    const user = await env.DB.prepare(`
      SELECT u.*, e.id as employee_id, e.full_name, e.position
      FROM users u
      LEFT JOIN employees e ON u.id = e.user_id
      WHERE u.username = ? AND u.is_active = 1
    `).bind(username).first();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check password (in real app, use bcrypt)
    if (password !== 'password123') { // Temporary - use proper password hashing
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate token (simplified - use JWT in real app)
    const token = 'dummy-token-for-now';

    return new Response(JSON.stringify({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        employeeId: user.employee_id,
        fullName: user.full_name,
        position: user.position
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

async function handleLogout(request, env) {
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleGetMe(request, env) {
  // Get token from header
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Dummy response for now
  return new Response(JSON.stringify({
    success: true,
    user: {
      id: 1,
      username: 'admin',
      role: 'admin',
      fullName: 'ဆရာသီ'
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}