import { handleAuth } from './auth.js';
import { handleEmployees } from './employees.js';
import { handleAttendance } from './attendance.js';
import { handleLeaves } from './leaves.js';
import { handlePayroll } from './payroll.js';
import { handleSettings } from './settings.js';
import { handleReports } from './reports.js';
import { Zuzu } from './ai-agent/zuzu.js';
import { authenticate } from './middleware.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };

    // Handle OPTIONS request (CORS preflight)
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      let response;

      // Auth routes (public)
      if (path.startsWith('/api/auth/')) {
        response = await handleAuth(request, env, ctx);
      }
      // Zuzu AI routes
      else if (path.startsWith('/api/zuzu/')) {
        const zuzu = new Zuzu(env);
        
        if (path === '/api/zuzu/chat' && method === 'POST') {
          const result = await zuzu.chat(request);
          response = new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        else if (path === '/api/zuzu/compare' && method === 'POST') {
          const result = await zuzu.compareAIs(request);
          response = new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        else if (path === '/api/zuzu/ais' && method === 'GET') {
          const ais = [
            { id: 'cloudflare', name: 'Cloudflare AI', icon: '☁️' }
          ];
          if (env.OPENAI_API_KEY) ais.push({ id: 'openai', name: 'ChatGPT', icon: '🤖' });
          if (env.GEMINI_API_KEY) ais.push({ id: 'gemini', name: 'Gemini', icon: '🌀' });
          
          response = new Response(JSON.stringify({ success: true, ais }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      // Protected routes
      else if (path.startsWith('/api/')) {
        // Authenticate user
        const user = await authenticate(request, env);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        // Route based on path
        if (path.startsWith('/api/employees')) {
          response = await handleEmployees(request, env, ctx, user);
        }
        else if (path.startsWith('/api/attendance')) {
          response = await handleAttendance(request, env, ctx, user);
        }
        else if (path.startsWith('/api/leaves')) {
          response = await handleLeaves(request, env, ctx, user);
        }
        else if (path.startsWith('/api/payroll')) {
          response = await handlePayroll(request, env, ctx, user);
        }
        else if (path.startsWith('/api/settings')) {
          response = await handleSettings(request, env, ctx, user);
        }
        else if (path.startsWith('/api/reports')) {
          response = await handleReports(request, env, ctx, user);
        }
        else {
          response = new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      else {
        response = new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Add CORS headers to response
      if (response) {
        const newResponse = new Response(response.body, response);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          newResponse.headers.set(key, value);
        });
        return newResponse;
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};
