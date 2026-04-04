// api/telegram-webhook.js — Telegram 인라인 버튼 콜백 수신
export const config = { runtime: 'edge' };

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const h = {
  'apikey': SUPA_KEY,
  'Authorization': `Bearer ${SUPA_KEY}`,
  'Content-Type': 'application/json',
};

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('ok');

  let body;
  try { body = await req.json(); } catch { return new Response('ok'); }

  const cb = body.callback_query;
  if (!cb) return new Response('ok');

  const [action, approval_id] = (cb.data ?? '').split(':');
  if (!approval_id || !['approve', 'reject'].includes(action)) return new Response('ok');

  const status = action === 'approve' ? 'approved' : 'rejected';

  // Supabase 상태 업데이트
  await fetch(`${SUPA_URL}/rest/v1/approvals?id=eq.${approval_id}`, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({ status, resolved_at: new Date().toISOString() }),
  });

  // 버튼 로딩 제거
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: cb.id,
      text: status === 'approved' ? '✅ 승인됨' : '❌ 거부됨',
    }),
  });

  // 원본 메시지 버튼 제거 + 결과 표시
  const resultText = cb.message.text + (status === 'approved' ? '\n\n✅ 승인됨' : '\n\n❌ 거부됨');
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: cb.message.chat.id,
      message_id: cb.message.message_id,
      text: resultText,
      reply_markup: { inline_keyboard: [] },
    }),
  });

  return new Response('ok');
}
