export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: '잘못된 요청입니다.' }), { status: 400 });
  }

  const { user_id, code } = body;
  if (!user_id || !code)
    return new Response(JSON.stringify({ error: '필수 항목이 누락됐습니다.' }), { status: 400 });

  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  const headers = { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' };

  // 인증 코드 조회
  const vRes = await fetch(
    `${SUPA_URL}/rest/v1/email_verifications?user_id=eq.${encodeURIComponent(user_id)}&order=created_at.desc&limit=1`,
    { headers }
  );
  const verifications = await vRes.json();

  if (!verifications.length)
    return new Response(JSON.stringify({ error: '인증 코드가 없습니다. 다시 시도해주세요.' }), { status: 400 });

  const v = verifications[0];

  // 만료 체크
  if (new Date(v.expires_at) < new Date())
    return new Response(JSON.stringify({ error: '인증 코드가 만료됐습니다. 다시 요청해주세요.' }), { status: 400 });

  // 코드 일치 체크
  if (v.code !== String(code).trim())
    return new Response(JSON.stringify({ error: '인증 코드가 틀렸습니다.' }), { status: 400 });

  // 인증 완료: email_verified = true
  await fetch(`${SUPA_URL}/rest/v1/users?user_id=eq.${encodeURIComponent(user_id)}`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ email_verified: true })
  });

  // 사용된 코드 삭제
  await fetch(`${SUPA_URL}/rest/v1/email_verifications?user_id=eq.${encodeURIComponent(user_id)}`, {
    method: 'DELETE', headers
  }).catch(() => {});

  // 유저 정보 조회
  const uRes = await fetch(
    `${SUPA_URL}/rest/v1/users?user_id=eq.${encodeURIComponent(user_id)}&select=user_id,nickname,email,star_x,star_y,star_z,star_color,star_size,plan_type,invite_count`,
    { headers }
  );
  const users = await uRes.json();
  const user = users[0];

  // 세션 토큰 발급 (30일)
  const token = crypto.randomUUID();
  const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await fetch(`${SUPA_URL}/rest/v1/sessions`, {
    method: 'POST', headers,
    body: JSON.stringify({ token, user_id, expires_at })
  }).catch(() => {});

  return new Response(JSON.stringify({ user, token }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
}
