export const config = { runtime: 'edge' };

// 토스페이먼츠 결제 승인 + plan 업데이트
export default async function handler(req) {
  if (req.method !== 'POST')
    return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: '잘못된 요청' }), { status: 400 });
  }

  const { paymentKey, orderId, amount, user_id, plan } = body;
  if (!paymentKey || !orderId || !amount || !user_id || !plan)
    return new Response(JSON.stringify({ error: '필수 항목 누락' }), { status: 400 });

  // 세션 토큰 검증 — 결제는 반드시 본인만
  const token = req.headers.get('x-session-token');
  if (!token)
    return new Response(JSON.stringify({ error: '인증 필요' }), { status: 401 });

  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  const sessRes = await fetch(
    `${SUPA_URL}/rest/v1/sessions?token=eq.${encodeURIComponent(token)}&select=user_id,expires_at`,
    { headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` } }
  );
  const sessData = await sessRes.json();
  if (!sessData[0] || new Date(sessData[0].expires_at) < new Date())
    return new Response(JSON.stringify({ error: '세션 만료. 다시 로그인해주세요.' }), { status: 401 });
  if (sessData[0].user_id !== user_id)
    return new Response(JSON.stringify({ error: '권한 없음' }), { status: 403 });

  // 플랜별 금액 검증 (변조 방지)
  const PLAN_PRICE = { starter: 4900, pro: 14900 };
  if (!PLAN_PRICE[plan] || PLAN_PRICE[plan] !== Number(amount))
    return new Response(JSON.stringify({ error: '금액 불일치' }), { status: 400 });

  const TOSS_SECRET = process.env.TOSS_SECRET_KEY;

  // 토스페이먼츠 결제 승인
  const confirmRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(TOSS_SECRET + ':')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  const confirmData = await confirmRes.json();
  if (!confirmRes.ok) {
    return new Response(JSON.stringify({
      error: confirmData.message || '결제 승인 실패',
      code: confirmData.code
    }), { status: 400 });
  }

  // Supabase plan 업데이트
  const h = {
    'apikey': SUPA_KEY,
    'Authorization': `Bearer ${SUPA_KEY}`,
    'Content-Type': 'application/json',
  };

  // 구독 만료일: 30일 후
  const subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const updateRes = await fetch(
    `${SUPA_URL}/rest/v1/users?user_id=eq.${encodeURIComponent(user_id)}`,
    {
      method: 'PATCH',
      headers: { ...h, 'Prefer': 'return=representation' },
      body: JSON.stringify({
        plan_type: plan,
        plan: plan,
        paid_until: subscriptionEnd,
      }),
    }
  );

  if (!updateRes.ok) {
    await updateRes.text();
    // 결제는 됐는데 DB 업데이트 실패 — 텔레그램 긴급 알림
    const TG_TOKEN = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    const TG_CHAT = process.env.TELEGRAM_CHAT_ID;
    if (TG_TOKEN && TG_CHAT) {
      fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TG_CHAT,
          text: `🚨 <b>결제 DB 업데이트 실패!</b>\nuser_id: ${user_id}\nplan: ${plan}\norderId: ${orderId}\n금액: ₩${amount}\n\n수동 처리 필요!`,
          parse_mode: 'HTML',
        }),
      }).catch(() => {});
    }
    return new Response(JSON.stringify({ error: 'DB 업데이트 실패. 고객센터 문의 바랍니다.' }), { status: 500 });
  }

  // Telegram 결제 완료 알림
  const TG_TOKEN = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const TG_CHAT = process.env.TELEGRAM_CHAT_ID;
  if (TG_TOKEN && TG_CHAT) {
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TG_CHAT,
        text: `💳 <b>결제 완료!</b>\nuser: ${user_id}\nplan: ${plan === 'pro' ? '💜 Pro' : '💙 Starter'}\n금액: ₩${Number(amount).toLocaleString('ko-KR')}\norderId: ${orderId}`,
        parse_mode: 'HTML',
      }),
    }).catch(() => {});
  }

  return new Response(JSON.stringify({
    ok: true,
    plan,
    subscription_end: subscriptionEnd,
    orderId,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
