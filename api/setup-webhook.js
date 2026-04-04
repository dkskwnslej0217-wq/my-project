// api/setup-webhook.js — Telegram 웹훅 등록 (1회용)
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const secret = req.headers.get('x-pipeline-secret');
  if (secret !== process.env.PIPELINE_SECRET)
    return new Response('Unauthorized', { status: 401 });

  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN;
  const webhookUrl = `https://my-project-xi-sand-93.vercel.app/api/telegram-webhook`;

  // getMe로 토큰 유효성 먼저 확인
  const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const meData = await meRes.json();

  if (!meData.ok) {
    return new Response(JSON.stringify({ error: '토큰 오류', detail: meData }), {
      status: 400, headers: { 'content-type': 'application/json' }
    });
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl }),
  });
  const data = await res.json();
  return new Response(JSON.stringify({ bot: meData.result.username, webhook: data }), {
    headers: { 'content-type': 'application/json' }
  });
}
