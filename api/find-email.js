export const config = { runtime: 'edge' };

async function isRateLimited(ip) {
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/check_rate_limit`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_key: `find-email:${ip}`, p_window: 60, p_limit: 5 }),
    });
    const data = await res.json();
    return data === true;
  } catch { return false; }
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  const visible = local.slice(0, 3);
  const masked = '*'.repeat(Math.max(local.length - 3, 2));
  return `${visible}${masked}@${domain}`;
}

export default async function handler(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (await isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: '잠시 후 다시 시도해주세요.' }), {
      status: 429, headers: { 'Content-Type': 'application/json' }
    });
  }

  const nickname = new URL(req.url).searchParams.get('nickname');
  if (!nickname) return new Response(JSON.stringify({ error: '닉네임을 입력해주세요.' }), { status: 400 });

  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/users?nickname=ilike.${encodeURIComponent(nickname)}&select=email&limit=1`,
    { headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` } }
  );
  const data = await res.json();
  if (!data.length) return new Response(JSON.stringify({ error: '닉네임을 찾을 수 없습니다.' }), { status: 404 });

  return new Response(JSON.stringify({ email: maskEmail(data[0].email) }), {
    headers: { 'content-type': 'application/json' }
  });
}
