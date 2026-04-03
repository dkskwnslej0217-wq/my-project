// api/monthly-reset.js — 매월 1일 유저 사용량 초기화
// Make.com 월별 스케줄 → 이 엔드포인트 호출

export const config = { runtime: 'edge' };

const SUPA_URL  = process.env.SUPABASE_URL;
const SUPA_KEY  = process.env.SUPABASE_SERVICE_KEY;
const TG_TOKEN  = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN;
const TG_CHAT   = process.env.TELEGRAM_CHAT_ID;
const PIPELINE_SECRET = process.env.PIPELINE_SECRET;

async function tg(msg) {
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text: msg }),
    });
  } catch { /* 무시 */ }
}

export default async function handler(req) {
  const secret = req.headers.get('x-pipeline-secret');
  if (secret !== PIPELINE_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    // users 테이블 monthly_count 초기화
    const res = await fetch(`${SUPA_URL}/rest/v1/users`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ monthly_count: 0 }),
    });

    if (!res.ok) throw new Error(`Supabase ${res.status}`);

    const month = new Date().toISOString().slice(0, 7);
    await tg(`✅ 월 사용량 초기화 완료 (${month})\n전체 유저 monthly_count → 0`);

    return new Response(JSON.stringify({ ok: true, month }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch(e) {
    await tg(`❌ 월 초기화 실패\n${e.message}`);
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
  }
}
