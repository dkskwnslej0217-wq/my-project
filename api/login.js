export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: '잘못된 요청입니다.' }), { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password)
    return new Response(JSON.stringify({ error: '이메일과 비밀번호를 입력해주세요.' }), { status: 400 });

  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_KEY;
  const headers = { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` };

  const pwHash = Array.from(new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password + 'nova_salt_2026'))
  )).map(b => b.toString(16).padStart(2, '0')).join('');

  const res = await fetch(
    `${SUPA_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=user_id,nickname,email,star_x,star_y,star_z,star_color,star_size,plan_type,invite_count`,
    { headers }
  );
  const users = await res.json();

  if (!users.length)
    return new Response(JSON.stringify({ error: '이메일 또는 비밀번호가 틀렸습니다.' }), { status: 401 });

  const user = users[0];

  // 별 성장 로직: invite_count → star_size 자동 갱신
  const ic = user.invite_count || 0;
  const newSize = ic >= 30 ? 3.0 : ic >= 10 ? 2.0 : ic >= 3 ? 1.5 : 1.0;
  if (newSize !== user.star_size) {
    await fetch(`${SUPA_URL}/rest/v1/users?user_id=eq.${user.user_id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ star_size: newSize })
    });
    user.star_size = newSize;
  }

  return new Response(JSON.stringify({ user }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
}
