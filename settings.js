// packages/backend/src/settings.js
export async function handleSettings(request, env, ctx, user) {
  const url = new URL(request.url);
  const method = request.method;

  if (user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  // Get all settings
  if (method === 'GET' && url.pathname === '/api/settings') {
    return getSettings(request, env);
  }

  // Update settings
  if (method === 'PUT' && url.pathname === '/api/settings') {
    return updateSettings(request, env);
  }

  // Get specific setting
  if (method === 'GET' && url.pathname.startsWith('/api/settings/')) {
    const key = url.pathname.replace('/api/settings/', '');
    return getSettingByKey(key, env);
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
}

export async function getSettings(env) {
  try {
    const settings = await env.DB.prepare('SELECT key, value FROM settings').all();
    
    const result = {};
    settings.results.forEach(s => {
      result[s.key] = s.value;
    });

    return new Response(JSON.stringify({
      success: true,
      settings: result
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

async function getSettingByKey(key, env) {
  try {
    const setting = await env.DB.prepare(
      'SELECT value FROM settings WHERE key = ?'
    ).bind(key).first();

    return new Response(JSON.stringify({
      success: true,
      key,
      value: setting ? setting.value : null
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

async function updateSettings(request, env) {
  try {
    const { settings, company, payrollSettings, attendanceSettings, aiSettings } = await request.json();

    // Start transaction
    await env.DB.exec('BEGIN TRANSACTION');

    try {
      // Update general settings
      if (settings) {
        for (const [key, value] of Object.entries(settings)) {
          await env.DB.prepare(`
            INSERT INTO settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
          `).bind(key, value.toString()).run();
        }
      }

      // Update company settings
      if (company) {
        for (const [key, value] of Object.entries(company)) {
          await env.DB.prepare(`
            INSERT INTO settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
          `).bind(`company_${key}`, value.toString()).run();
        }
      }

      // Update payroll settings
      if (payrollSettings) {
        for (const [key, value] of Object.entries(payrollSettings)) {
          await env.DB.prepare(`
            INSERT INTO settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
          `).bind(`payroll_${key}`, value.toString()).run();
        }
      }

      // Update attendance settings
      if (attendanceSettings) {
        for (const [key, value] of Object.entries(attendanceSettings)) {
          await env.DB.prepare(`
            INSERT INTO settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
          `).bind(`attendance_${key}`, JSON.stringify(value)).run();
        }
      }

      // Update AI settings
      if (aiSettings) {
        for (const [key, value] of Object.entries(aiSettings)) {
          await env.DB.prepare(`
            INSERT INTO settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
          `).bind(`ai_${key}`, JSON.stringify(value)).run();
        }
      }

      await env.DB.exec('COMMIT');

      return new Response(JSON.stringify({
        success: true,
        message: 'ဆက်တင်များ သိမ်းပြီးပါပြီ'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      await env.DB.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}