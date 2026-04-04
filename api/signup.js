export const config = { runtime: 'edge' };

// 별 좌표 랜덤 생성 (행성 궤도 50 밖, 우주 공간)
function randomStar() {
  const r = 70 + Math.random() * 300;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return {
    x: parseFloat((r * Math.sin(phi) * Math.cos(theta)).toFixed(2)),
    y: parseFloat(((Math.random() - 0.5) * 40).toFixed(2)),
    z: parseFloat((r * Math.sin(phi) * Math.sin(theta)).toFixed(2)),
  };
}

// 닉네임 기반 고유 색상
function nickColor(nick) {
  const colors = ['#a78bfa','#60a5fa','#34d399','#fbbf24','#f87171',
                  '#e879f9','#2dd4bf','#fb923c','#818cf8','#f472b6'];
  let h = 0;
  for (let i = 0; i < nick.length; i++) h = (h * 31 + nick.charCodeAt(i)) % colors.length;
  return colors[Math.abs(h)];
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: '잘못된 요청입니다.' }), { status: 400 });
  }

  const { email, nickname, password, referrer_id } = body;
  if (!email || !nickname || !password)
    return new Response(JSON.stringify({ error: '필수 항목이 누락됐습니다.' }), { status: 400 });
  if (password.length < 8)
    return new Response(JSON.stringify({ error: '비밀번호는 8자 이상이어야 합니다.' }), { status: 400 });

  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  const headers = { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`,
                    'Content-Type': 'application/json', 'Prefer': 'return=representation' };

  // 이메일 중복 체크
  const check = await fetch(`${SUPA_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=user_id`,
    { headers });
  const existing = await check.json();
  if (existing.length > 0)
    return new Response(JSON.stringify({ error: '이미 사용 중인 이메일입니다.' }), { status: 409 });

  // 비밀번호 해싱 — PBKDF2 (랜덤 salt, 100,000 iterations)
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const hashBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
  const saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hashBits)).map(b => b.toString(16).padStart(2, '0')).join('');
  const pwHash = `pbkdf2:${saltHex}:${hashHex}`;

  const star = randomStar();
  const user_id = nickname.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now().toString(36);
  const color = nickColor(nickname);

  // 유저 생성
  const insert = await fetch(`${SUPA_URL}/rest/v1/users`, {
    method: 'POST', headers,
    body: JSON.stringify({
      user_id,
      email,
      nickname,
      password_hash: pwHash,
      plan_type: 'free',
      daily_count: 0,
      star_x: star.x,
      star_y: star.y,
      star_z: star.z,
      star_color: color,
      star_size: 1.0,
      referrer_id: referrer_id || null,
      invite_count: 0,
    })
  });

  if (!insert.ok) {
    await insert.text();
    return new Response(JSON.stringify({ error: '계정 생성 실패. 다시 시도해주세요.' }), { status: 500 });
  }

  await insert.json();

  // 레퍼럴 기록
  if (referrer_id) {
    // referrals 테이블에 저장
    await fetch(`${SUPA_URL}/rest/v1/referrals`, {
      method: 'POST', headers,
      body: JSON.stringify({ referrer_id, referred_id: user_id, converted: false })
    });
    // 초대한 사람 invite_count +1 (현재값 조회 후 +1)
    const refRes = await fetch(`${SUPA_URL}/rest/v1/users?user_id=eq.${referrer_id}&select=invite_count`, { headers });
    const refData = await refRes.json();
    const currentCount = refData[0]?.invite_count || 0;
    await fetch(`${SUPA_URL}/rest/v1/users?user_id=eq.${referrer_id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ invite_count: currentCount + 1 })
    });
  }

  // 신규 가입 Telegram 알림 (fire-and-forget)
  const TG_TOKEN = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const TG_CHAT = process.env.TELEGRAM_CHAT_ID;
  if (TG_TOKEN && TG_CHAT) {
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TG_CHAT,
        text: `🌟 <b>신규 유저 가입!</b>\n닉네임: <b>${nickname}</b>\n이메일: ${email}\n플랜: free${referrer_id ? '\n레퍼럴: ' + referrer_id : ''}`,
        parse_mode: 'HTML'
      })
    }).catch(() => {});
  }

  // 세션 토큰 발급 (30일 만료)
  const token = crypto.randomUUID();
  const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await fetch(`${SUPA_URL}/rest/v1/sessions`, {
    method: 'POST',
    headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, user_id, expires_at })
  }).catch(() => {});

  return new Response(JSON.stringify({
    user: { user_id, nickname, email, star_x: star.x, star_y: star.y, star_z: star.z,
            star_color: color, star_size: 1.0 },
    token
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
