export const config = { runtime: 'edge' };

function randomTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  for (const b of bytes) result += chars[b % chars.length];
  return result;
}

async function hashPassword(password) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' }, km, 256);
  const s = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const h = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:${s}:${h}`;
}

async function isRateLimited(ip) {
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/check_rate_limit`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_key: `forgot:${ip}`, p_window: 300, p_limit: 3 }),
    });
    const data = await res.json();
    return data === true;
  } catch { return false; }
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const origin = req.headers.get('origin') ?? '';
  const allowed = origin === 'https://my-project-xi-sand-93.vercel.app' || origin === '';
  if (!allowed) return new Response('Forbidden', { status: 403 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (await isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: '요청이 너무 많습니다. 5분 후 다시 시도해주세요.' }), {
      status: 429, headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: '잘못된 요청입니다.' }), { status: 400 });
  }

  const { email } = body;
  if (!email) return new Response(JSON.stringify({ error: '이메일을 입력해주세요.' }), { status: 400 });

  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const headers = { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` };

  // 유저 조회
  const res = await fetch(
    `${SUPA_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=user_id,nickname`,
    { headers }
  );
  const users = await res.json();

  if (!users.length) {
    return new Response(JSON.stringify({ error: '가입된 이메일이 없습니다.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const user = users[0];
  const tempPw = randomTempPassword();
  const hashed = await hashPassword(tempPw);

  // DB 업데이트
  await fetch(`${SUPA_URL}/rest/v1/users?user_id=eq.${user.user_id}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password_hash: hashed })
  });

  // Resend 이메일 발송
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to: email,
      subject: '[NOVA UNIVERSE] 임시 비밀번호 안내',
      html: `
        <div style="background:#000005;color:#fff;font-family:monospace;padding:32px;border-radius:12px;">
          <h2 style="color:#7c3aed;margin-bottom:16px;">NOVA UNIVERSE</h2>
          <p>안녕하세요, <strong>${user.nickname}</strong>님.</p>
          <p style="margin-top:12px;">임시 비밀번호가 발급됐습니다. 로그인 후 반드시 변경해주세요.</p>
          <div style="background:#1a0033;border:1px solid #7c3aed;border-radius:8px;padding:16px;margin:20px 0;text-align:center;">
            <span style="font-size:1.4rem;letter-spacing:0.2em;color:#e9d5ff;">${tempPw}</span>
          </div>
          <p style="color:rgba(255,255,255,0.5);font-size:0.8rem;">이 이메일을 요청하지 않으셨다면 무시하셔도 됩니다.</p>
        </div>
      `
    })
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
}
