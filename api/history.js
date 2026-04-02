export const config = { runtime: 'edge' };

export default async function handler(req) {
  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  const headers = { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' };

  if (req.method === 'GET') {
    const user_id = new URL(req.url).searchParams.get('user_id');
    if (!user_id) return new Response('[]', { headers: { 'content-type': 'application/json' } });
    const res = await fetch(
      `${SUPA_URL}/rest/v1/chat_history?user_id=eq.${encodeURIComponent(user_id)}&order=created_at.asc&limit=50`,
      { headers }
    );
    const data = await res.json();
    return new Response(JSON.stringify(Array.isArray(data) ? data : []), { headers: { 'content-type': 'application/json' } });
  }

  if (req.method === 'POST') {
    const token = req.headers.get('x-session-token');
    if (!token) return new Response(JSON.stringify({ error: '인증 필요' }), { status: 401 });

    let body;
    try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'bad request' }), { status: 400 }); }
    const { user_id, role, content } = body;
    if (!user_id || !role || !content) return new Response(JSON.stringify({ error: 'missing fields' }), { status: 400 });

    const sessRes = await fetch(
      `${SUPA_URL}/rest/v1/sessions?token=eq.${encodeURIComponent(token)}&select=user_id,expires_at`,
      { headers }
    );
    const sessData = await sessRes.json();
    if (!sessData[0] || new Date(sessData[0].expires_at) < new Date())
      return new Response(JSON.stringify({ error: '세션 만료' }), { status: 401 });
    if (sessData[0].user_id !== user_id)
      return new Response(JSON.stringify({ error: '권한 없음' }), { status: 403 });

    await fetch(`${SUPA_URL}/rest/v1/chat_history`, {
      method: 'POST', headers,
      body: JSON.stringify({ user_id, role, content: String(content).slice(0, 2000) })
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  return new Response('Method not allowed', { status: 405 });
}
