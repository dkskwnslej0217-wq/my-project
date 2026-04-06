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
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  const headers = { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` };

  const res = await fetch(
    `${SUPA_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=user_id,nickname,email,star_x,star_y,star_z,star_color,star_size,plan_type,invite_count,invite_code,password_hash,email_verified`,
    { headers }
  );
  const users = await res.json();

  if (!users.length)
    return new Response(JSON.stringify({ error: '이메일 또는 비밀번호가 틀렸습니다.' }), { status: 401 });

  const user = users[0];
  const stored = user.password_hash || '';
  let passwordValid = false;

  if (stored.startsWith('pbkdf2:')) {
    // PBKDF2 검증
    const [, saltHex, hashHex] = stored.split(':');
    const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
    const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, km, 256);
    const check = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
    passwordValid = check === hashHex;
  } else {
    // 레거시 SHA-256 검증 후 자동 PBKDF2 업그레이드
    const legacyHash = Array.from(new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password + 'nova_salt_2026'))
    )).map(b => b.toString(16).padStart(2, '0')).join('');
    passwordValid = legacyHash === stored;
    if (passwordValid) {
      const saltBytes = crypto.getRandomValues(new Uint8Array(16));
      const km2 = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
      const bits2 = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' }, km2, 256);
      const s2 = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const h2 = Array.from(new Uint8Array(bits2)).map(b => b.toString(16).padStart(2, '0')).join('');
      fetch(`${SUPA_URL}/rest/v1/users?user_id=eq.${user.user_id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password_hash: `pbkdf2:${s2}:${h2}` })
      }).catch(() => {});
    }
  }

  if (!passwordValid)
    return new Response(JSON.stringify({ error: '이메일 또는 비밀번호가 틀렸습니다.' }), { status: 401 });

  // 이메일 인증 체크
  if (!user.email_verified) {
    // 새 인증 코드 발송
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const code_expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const authHeaders = { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' };
    // 기존 코드 삭제 후 새 코드 저장
    await fetch(`${SUPA_URL}/rest/v1/email_verifications?user_id=eq.${encodeURIComponent(user.user_id)}`, {
      method: 'DELETE', headers: authHeaders
    }).catch(() => {});
    await fetch(`${SUPA_URL}/rest/v1/email_verifications`, {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({ user_id: user.user_id, code, expires_at: code_expires })
    }).catch(() => {});
    const RESEND_KEY = process.env.RESEND_API_KEY;
    const FROM = process.env.RESEND_FROM || 'NOVA UNIVERSE <onboarding@resend.dev>';
    if (RESEND_KEY) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM, to: [user.email],
          subject: '[NOVA] 이메일 인증 코드',
          html: `<div style="background:#000005;color:#fff;font-family:monospace;padding:2rem;border-radius:12px;max-width:480px;"><h2 style="color:#a78bfa;">NOVA UNIVERSE</h2><p>인증 코드:</p><div style="background:rgba(109,40,217,.2);border:1px solid rgba(139,92,246,.4);border-radius:10px;padding:1.5rem;text-align:center;margin:1rem 0;"><span style="font-size:2.5rem;letter-spacing:.5em;color:#a78bfa;font-weight:bold;">${code}</span></div><p style="color:rgba(255,255,255,.4);font-size:.85rem;">10분 내에 입력해주세요.</p></div>`
        })
      }).catch(() => {});
    }
    return new Response(JSON.stringify({
      needs_verification: true,
      user_id: user.user_id,
      email: user.email
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  delete user.email_verified;
  delete user.password_hash;
  // 세션 토큰 발급 (30일 만료)
  const token = crypto.randomUUID();
  const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await fetch(`${SUPA_URL}/rest/v1/sessions`, {
    method: 'POST',
    headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, user_id: user.user_id, expires_at })
  }).catch(() => {});

  // invite_code 없는 기존 유저 → 자동 생성
  if (!user.invite_code) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const newCode = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map(b => chars[b % chars.length]).join('');
    await fetch(`${SUPA_URL}/rest/v1/users?user_id=eq.${user.user_id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: newCode })
    }).catch(() => {});
    user.invite_code = newCode;
  }

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

  return new Response(JSON.stringify({ user, token }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
}
