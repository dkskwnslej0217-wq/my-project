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
      body: JSON.stringify({ p_key: `search-user:${ip}`, p_window: 60, p_limit: 20 }),
    });
    const data = await res.json();
    return data === true;
  } catch { return false; }
}

export default async function handler(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (await isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: '잠시 후 다시 시도해주세요.' }), {
      status: 429, headers: { 'Content-Type': 'application/json' }
    });
  }

  const nickname = new URL(req.url).searchParams.get('nickname');
  if (!nickname) return new Response(JSON.stringify({ error: 'nickname required' }), { status: 400 });

  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/users?nickname=ilike.${encodeURIComponent(nickname)}&select=user_id,nickname,star_x,star_y,star_z,star_color,star_size&limit=1`,
    { headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` } }
  );
  const data = await res.json();
  if (!data.length) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
  return new Response(JSON.stringify(data[0]), { headers: { 'content-type': 'application/json' } });
}
