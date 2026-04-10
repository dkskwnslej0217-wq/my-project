export const config = { runtime: 'edge' };

export default async function handler(req) {
  const key = req.headers.get('x-admin-key');
  const validKey = process.env.ADMIN_PASSWORD || process.env.MASTER_PASSWORD;
  if (!key || key !== validKey)
    return new Response(JSON.stringify({ error: '인증 실패' }), { status: 401 });

  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  const h = { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' };

  // 유저 목록 조회
  if (req.method === 'GET') {
    const [usersRes, logsRes] = await Promise.all([
      fetch(`${SUPA_URL}/rest/v1/users?select=user_id,email,nickname,plan_type,daily_count,invite_count,star_color,created_at&order=created_at.desc&limit=500`, { headers: h }),
      fetch(`${SUPA_URL}/rest/v1/ai_logs?select=model,success,created_at&order=created_at.desc&limit=100`, { headers: h }),
    ]);
    const [users, logs] = await Promise.all([usersRes.json(), logsRes.json()]);
    return new Response(JSON.stringify({
      users: Array.isArray(users) ? users : [],
      logs: Array.isArray(logs) ? logs : [],
    }), { headers: { 'content-type': 'application/json' } });
  }

  // 유저 삭제
  if (req.method === 'DELETE') {
    let body;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: '잘못된 요청' }), { status: 400 });
    }
    const { user_id } = body;
    if (!user_id)
      return new Response(JSON.stringify({ error: 'user_id 필요' }), { status: 400 });

    // 연결 데이터 먼저 삭제 (순서 중요)
    await Promise.all([
      fetch(`${SUPA_URL}/rest/v1/chat_history?user_id=eq.${encodeURIComponent(user_id)}`, { method: 'DELETE', headers: h }),
      fetch(`${SUPA_URL}/rest/v1/user_quests?user_id=eq.${encodeURIComponent(user_id)}`, { method: 'DELETE', headers: h }),
      fetch(`${SUPA_URL}/rest/v1/projects?user_id=eq.${encodeURIComponent(user_id)}`, { method: 'DELETE', headers: h }),
      fetch(`${SUPA_URL}/rest/v1/sessions?user_id=eq.${encodeURIComponent(user_id)}`, { method: 'DELETE', headers: h }),
      fetch(`${SUPA_URL}/rest/v1/email_verifications?user_id=eq.${encodeURIComponent(user_id)}`, { method: 'DELETE', headers: h }),
      fetch(`${SUPA_URL}/rest/v1/referrals?referred_id=eq.${encodeURIComponent(user_id)}`, { method: 'DELETE', headers: h }),
    ]);

    // 유저 삭제
    const del = await fetch(`${SUPA_URL}/rest/v1/users?user_id=eq.${encodeURIComponent(user_id)}`, { method: 'DELETE', headers: h });
    if (!del.ok)
      return new Response(JSON.stringify({ error: '삭제 실패' }), { status: 500 });

    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  }

  return new Response('Method not allowed', { status: 405 });
}
