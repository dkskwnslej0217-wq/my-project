export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: '잘못된 요청' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const { type, user_id, ...data } = body;

  if (!type || !['interaction', 'feedback'].includes(type)) {
    return new Response(JSON.stringify({ error: 'type은 interaction|feedback 중 하나' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const table = type === 'feedback' ? 'feedback' : 'interactions';

  const payload = type === 'feedback'
    ? { user_id: user_id || null, issue: data.issue, category: data.category || null }
    : { user_id: user_id || null, action: data.action, target: data.target || null, meta: data.meta || null };

  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: '저장 실패' }), {
      status: 502, headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
}
