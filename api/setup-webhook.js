// api/setup-webhook.js — Telegram 웹훅 등록 (1회용)
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const secret = req.headers.get('x-pipeline-secret');
  if (secret !== process.env.PIPELINE_SECRET)
    return new Response('Unauthorized', { status: 401 });

  const url = `https://my-project-xi-sand-93.vercel.app/api/telegram-webhook`;
  const res = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(url)}`
  );
  const data = await res.json();
  return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
}
