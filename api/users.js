export const config = { runtime: 'edge' };

export default async function handler(_req) {
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/users?select=user_id,nickname,star_x,star_color,star_size&limit=200`,
    { headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` } }
  );
  const data = await res.json();
  return new Response(JSON.stringify(Array.isArray(data) ? data : []), {
    headers: { 'content-type': 'application/json' }
  });
}
