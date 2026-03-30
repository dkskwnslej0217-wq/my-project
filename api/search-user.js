export const config = { runtime: 'edge' };

export default async function handler(req) {
  const nickname = new URL(req.url).searchParams.get('nickname');
  if (!nickname) return new Response(JSON.stringify({ error: 'nickname required' }), { status: 400 });

  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/users?nickname=ilike.${encodeURIComponent(nickname)}&select=user_id,nickname,star_x,star_y,star_z,star_color,star_size&limit=1`,
    { headers: { 'apikey': process.env.SUPABASE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_KEY}` } }
  );
  const data = await res.json();
  if (!data.length) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
  return new Response(JSON.stringify(data[0]), { headers: { 'content-type': 'application/json' } });
}
