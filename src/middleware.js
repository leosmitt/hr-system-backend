export async function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return null;
  }

  // Dummy authentication for now
  // In real app, verify JWT token
  return {
    id: 1,
    username: 'admin',
    role: 'admin',
    employeeId: 1
  };
}

export function checkPermission(user, requiredRole) {
  if (user.role === 'admin') return true;
  if (requiredRole === 'employee' && user.role === 'employee') return true;
  return false;
}