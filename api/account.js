export const config = { runtime: 'edge' };

export default async function handler(req) {
  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  const h = { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' };

  // 세션 토큰 검증
  const token = req.headers.get('x-session-token');
  if (!token) return new Response(JSON.stringify({ error: '인증 필요' }), { status: 401 });
  const sessRes = await fetch(`${SUPA_URL}/rest/v1/sessions?token=eq.${encodeURIComponent(token)}&select=user_id,expires_at`, { headers: h });
  const sess = await sessRes.json();
  if (!sess[0] || new Date(sess[0].expires_at) < new Date())
    return new Response(JSON.stringify({ error: '세션이 만료됐습니다.' }), { status: 401 });
  const userId = sess[0].user_id;

  // ─── 비밀번호 변경 (PATCH) ──────────────────────────────
  if (req.method === 'PATCH') {
    const body = await req.json().catch(() => ({}));
    const { current_password, new_password } = body;
    if (!current_password || !new_password)
      return new Response(JSON.stringify({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' }), { status: 400 });
    if (new_password.length < 8)
      return new Response(JSON.stringify({ error: '새 비밀번호는 8자 이상이어야 합니다.' }), { status: 400 });

    // 현재 비밀번호 확인
    const uRes = await fetch(`${SUPA_URL}/rest/v1/users?user_id=eq.${encodeURIComponent(userId)}&select=password_hash`, { headers: h });
    const uData = await uRes.json();
    const stored = uData[0]?.password_hash || '';
    let valid = false;
    if (stored.startsWith('pbkdf2:')) {
      const [, saltHex, hashHex] = stored.split(':');
      const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
      const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(current_password), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, km, 256);
      valid = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2,'0')).join('') === hashHex;
    }
    if (!valid) return new Response(JSON.stringify({ error: '현재 비밀번호가 틀렸습니다.' }), { status: 400 });

    // 새 비밀번호 해싱
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    const km2 = await crypto.subtle.importKey('raw', new TextEncoder().encode(new_password), 'PBKDF2', false, ['deriveBits']);
    const bits2 = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' }, km2, 256);
    const s = Array.from(saltBytes).map(b => b.toString(16).padStart(2,'0')).join('');
    const hx = Array.from(new Uint8Array(bits2)).map(b => b.toString(16).padStart(2,'0')).join('');
    await fetch(`${SUPA_URL}/rest/v1/users?user_id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH', headers: { ...h, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ password_hash: `pbkdf2:${s}:${hx}` }),
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // ─── 회원 탈퇴 (DELETE) ─────────────────────────────────
  if (req.method === 'DELETE') {
    const body = await req.json().catch(() => ({}));
    const { password } = body;
    if (!password) return new Response(JSON.stringify({ error: '비밀번호를 입력해주세요.' }), { status: 400 });

    // 비밀번호 확인
    const uRes = await fetch(`${SUPA_URL}/rest/v1/users?user_id=eq.${encodeURIComponent(userId)}&select=password_hash`, { headers: h });
    const uData = await uRes.json();
    const stored = uData[0]?.password_hash || '';
    let valid = false;
    if (stored.startsWith('pbkdf2:')) {
      const [, saltHex, hashHex] = stored.split(':');
      const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
      const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, km, 256);
      valid = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2,'0')).join('') === hashHex;
    }
    if (!valid) return new Response(JSON.stringify({ error: '비밀번호가 틀렸습니다.' }), { status: 400 });

    // 데이터 삭제 (순서 중요: 외래키 의존 먼저)
    await Promise.all([
      fetch(`${SUPA_URL}/rest/v1/sessions?user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE', headers: h }),
      fetch(`${SUPA_URL}/rest/v1/chat_history?user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE', headers: h }),
      fetch(`${SUPA_URL}/rest/v1/user_quests?user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE', headers: h }),
      fetch(`${SUPA_URL}/rest/v1/projects?user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE', headers: h }),
    ]);
    await fetch(`${SUPA_URL}/rest/v1/users?user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE', headers: h });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  return new Response('Method not allowed', { status: 405 });
}
