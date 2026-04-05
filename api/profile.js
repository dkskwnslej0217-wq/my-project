export const config = { runtime: 'edge' };

export default async function handler(req) {
  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  const h = { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` };

  const url = new URL(req.url);
  const userId = url.searchParams.get('user_id');
  if (!userId) return new Response(JSON.stringify({ error: 'user_id required' }), { status: 400, headers: { 'content-type': 'application/json' } });

  // 세션 검증
  const token = req.headers.get('x-session-token');
  if (!token) return new Response(JSON.stringify({ error: '인증 필요' }), { status: 401, headers: { 'content-type': 'application/json' } });
  const sessRes = await fetch(
    `${SUPA_URL}/rest/v1/sessions?token=eq.${encodeURIComponent(token)}&select=user_id,expires_at`,
    { headers: h }
  );
  const sessData = await sessRes.json();
  if (!sessData[0] || new Date(sessData[0].expires_at) < new Date() || sessData[0].user_id !== userId) {
    return new Response(JSON.stringify({ error: '세션 만료' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }

  if (req.method === 'GET') {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/users?user_id=eq.${encodeURIComponent(userId)}&select=business_context`,
      { headers: h }
    );
    const data = await res.json();
    return new Response(JSON.stringify({ business_context: data[0]?.business_context || '' }), {
      headers: { 'content-type': 'application/json' }
    });
  }

  if (req.method === 'PATCH') {
    let body;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }
    const { business_context } = body;
    if (typeof business_context !== 'string') {
      return new Response(JSON.stringify({ error: 'business_context must be string' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }
    await fetch(`${SUPA_URL}/rest/v1/users?user_id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { ...h, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ business_context: business_context.slice(0, 500) }),
    });
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  }

  return new Response('Method not allowed', { status: 405 });
}
