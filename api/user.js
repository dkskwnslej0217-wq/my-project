export const config = { runtime: 'edge' };

export default async function handler(req) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/users?user_id=eq.${encodeURIComponent(id)}&select=user_id,nickname,star_color,star_size,plan_type,invite_count,daily_count`,
    { headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` } }
  );
  const data = await res.json();
  if (!data.length) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
  return new Response(JSON.stringify(data[0]), { headers: { 'content-type': 'application/json' } });
}
