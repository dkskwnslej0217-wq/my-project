export const config = { runtime: 'edge' };

const ipMap = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const window = 60_000;
  const limit = 10;
  const entry = ipMap.get(ip) ?? { count: 0, start: now };
  if (now - entry.start > window) { ipMap.set(ip, { count: 1, start: now }); return false; }
  if (entry.count >= limit) return true;
  entry.count++;
  ipMap.set(ip, entry);
  return false;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const origin = req.headers.get('origin') ?? '';
  const allowed = origin === 'https://my-project-xi-sand-93.vercel.app' || origin === '';
  if (!allowed) {
    return new Response('Forbidden', { status: 403 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: '잠시 후 다시 시도해주세요.' }), {
      status: 429, headers: { 'Content-Type': 'application/json' }
    });
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

  if (type === 'feedback' && (!data.issue || data.issue.trim().length < 2 || data.issue.length > 500)) {
    return new Response(JSON.stringify({ error: '내용을 2~500자로 입력해주세요.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const table = type === 'feedback' ? 'feedback' : 'interactions';
  const payload = type === 'feedback'
    ? { user_id: user_id || null, issue: data.issue.trim(), category: data.category || null }
    : { user_id: user_id || null, action: (data.action ?? '').slice(0, 50), target: (data.target ?? '').slice(0, 100) || null, meta: data.meta || null };

  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
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
