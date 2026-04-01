export const config = { runtime: 'edge' };

const H = (env) => ({
  'apikey': env.SUPABASE_KEY,
  'Authorization': `Bearer ${env.SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
});

export default async function handler(req) {
  const env = { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY };
  const h = H(env);
  const url = new URL(req.url);

  // GET — 특정 target의 투표 수 + 내 투표 여부
  if (req.method === 'GET') {
    const target_type = url.searchParams.get('target_type') || 'cluster';
    const target_id   = url.searchParams.get('target_id');
    const user_id     = url.searchParams.get('user_id');
    if (!target_id) return new Response(JSON.stringify({ error: 'target_id required' }), { status: 400 });

    const [countRes, myRes] = await Promise.all([
      fetch(`${env.SUPABASE_URL}/rest/v1/votes?target_type=eq.${target_type}&target_id=eq.${encodeURIComponent(target_id)}&select=id`, { headers: h }),
      user_id
        ? fetch(`${env.SUPABASE_URL}/rest/v1/votes?target_type=eq.${target_type}&target_id=eq.${encodeURIComponent(target_id)}&user_id=eq.${encodeURIComponent(user_id)}&select=id`, { headers: h })
        : Promise.resolve(null),
    ]);
    const countData = await countRes.json();
    const myData = myRes ? await myRes.json() : [];

    return new Response(JSON.stringify({
      count: Array.isArray(countData) ? countData.length : 0,
      voted: Array.isArray(myData) && myData.length > 0,
    }), { headers: { 'content-type': 'application/json' } });
  }

  // POST — 투표 토글 (있으면 취소, 없으면 추가)
  if (req.method === 'POST') {
    const { user_id, target_type = 'cluster', target_id } = await req.json();
    if (!user_id || !target_id) return new Response(JSON.stringify({ error: '필수 항목 누락' }), { status: 400 });

    // 이미 투표했는지 확인
    const checkRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/votes?user_id=eq.${encodeURIComponent(user_id)}&target_type=eq.${target_type}&target_id=eq.${encodeURIComponent(target_id)}&select=id`,
      { headers: h }
    );
    const existing = await checkRes.json();

    if (Array.isArray(existing) && existing.length > 0) {
      // 취소
      await fetch(
        `${env.SUPABASE_URL}/rest/v1/votes?id=eq.${existing[0].id}`,
        { method: 'DELETE', headers: h }
      );
      return new Response(JSON.stringify({ ok: true, action: 'removed' }), { headers: { 'content-type': 'application/json' } });
    } else {
      // 추가
      await fetch(`${env.SUPABASE_URL}/rest/v1/votes`, {
        method: 'POST',
        headers: { ...h, 'Prefer': 'return=minimal,resolution=ignore-duplicates' },
        body: JSON.stringify({ user_id, target_type, target_id }),
      });
      return new Response(JSON.stringify({ ok: true, action: 'added' }), { headers: { 'content-type': 'application/json' } });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}
