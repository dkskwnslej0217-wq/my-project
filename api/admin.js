export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'GET')
    return new Response('Method not allowed', { status: 405 });

  const key = req.headers.get('x-admin-key');
  if (!key || key !== process.env.MASTER_PASSWORD)
    return new Response(JSON.stringify({ error: '인증 실패' }), { status: 401 });

  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  const h = { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` };

  const [usersRes, logsRes] = await Promise.all([
    fetch(`${SUPA_URL}/rest/v1/users?select=user_id,email,nickname,plan_type,daily_count,invite_count,star_color,created_at&order=created_at.desc&limit=500`, { headers: h }),
    fetch(`${SUPA_URL}/rest/v1/ai_logs?select=model,success,created_at&order=created_at.desc&limit=100`, { headers: h }),
  ]);

  const [users, logs] = await Promise.all([usersRes.json(), logsRes.json()]);

  return new Response(JSON.stringify({
    users: Array.isArray(users) ? users : [],
    logs: Array.isArray(logs) ? logs : [],
  }), { headers: { 'content-type': 'application/json' } });
}
