// api/request-approval.js — 승인 요청 생성 + Telegram 전송
export const config = { runtime: 'edge' };

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT  = process.env.TELEGRAM_CHAT_ID;

const h = {
  'apikey': SUPA_KEY,
  'Authorization': `Bearer ${SUPA_KEY}`,
  'Content-Type': 'application/json',
};

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = req.headers.get('x-pipeline-secret');
  if (secret !== process.env.PIPELINE_SECRET)
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'bad request' }), { status: 400 });
  }

  const { action_type, description, payload } = body;
  if (!action_type || !description)
    return new Response(JSON.stringify({ error: 'action_type, description 필요' }), { status: 400 });

  // Supabase에 승인 요청 저장
  const res = await fetch(`${SUPA_URL}/rest/v1/approvals`, {
    method: 'POST',
    headers: { ...h, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      action_type,
      description,
      payload: payload ? JSON.stringify(payload) : null,
      status: 'pending',
    }),
  });
  const data = await res.json();
  const approval = data[0];
  if (!approval?.id)
    return new Response(JSON.stringify({ error: 'Supabase 저장 실패' }), { status: 500 });

  // Telegram 인라인 버튼 메시지 전송
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TG_CHAT,
      text: `🔐 NOVA 승인 요청\n\n${description}`,
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ 승인', callback_data: `approve:${approval.id}` },
          { text: '❌ 거부', callback_data: `reject:${approval.id}` },
        ]],
      },
    }),
  });

  return new Response(JSON.stringify({ ok: true, approval_id: approval.id }), {
    headers: { 'content-type': 'application/json' },
  });
}
