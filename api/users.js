export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const inviteCode = url.searchParams.get('invite_code');

  // 초대코드로 닉네임 조회
  if (inviteCode) {
    const res = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/users?invite_code=eq.${encodeURIComponent(inviteCode)}&select=nickname`,
      { headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` } }
    );
    const data = await res.json();
    return new Response(JSON.stringify(data[0] || null), { headers: { 'content-type': 'application/json' } });
  }

  // 전체 유저 (3D 별 렌더링용)
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/users?select=user_id,nickname,star_x,star_color,star_size&limit=200`,
    { headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` } }
  );
  const data = await res.json();
  return new Response(JSON.stringify(Array.isArray(data) ? data : []), {
    headers: { 'content-type': 'application/json' }
  });
}
