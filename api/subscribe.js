export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const origin = req.headers.get('origin') ?? '';
  const allowed = origin.includes('vercel.app') || origin.includes('nova-universe') || origin === '';
  if (!allowed) {
    return new Response('Forbidden', { status: 403 });
  }

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: '잘못된 요청입니다.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const name  = (body.name  ?? '').trim().slice(0, 50);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: '올바른 이메일을 입력해주세요.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Supabase 직접 저장
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/subscribers`, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=ignore-duplicates',
    },
    body: JSON.stringify({
      email,
      name: name || null,
      source: 'nova-universe-landing',
      plan: 'free',
      created_at: new Date().toISOString(),
    }),
  });

  if (!res.ok && res.status !== 409) {
    return new Response(JSON.stringify({ error: '저장 중 오류가 발생했습니다. 다시 시도해주세요.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Make.com으로도 전달 → 구글시트 동기화 (실패해도 무시)
  if (process.env.MAKE_SHEETS_WEBHOOK) {
    fetch(process.env.MAKE_SHEETS_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'subscriber',
        timestamp: new Date().toISOString(),
        email, name: name || '',
        plan: 'free',
        source: 'nova-universe-landing',
      }),
    }).catch(() => {});
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
