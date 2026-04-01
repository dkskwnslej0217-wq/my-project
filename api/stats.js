export const config = { runtime: 'edge' };

const HEADERS = (env) => ({
  'apikey': env.SUPABASE_KEY,
  'Authorization': `Bearer ${env.SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
});

export default async function handler(req) {
  const env = { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY };
  const h = HEADERS(env);
  const url = new URL(req.url);

  // GET — 프로젝트별 성과 목록
  if (req.method === 'GET') {
    const project_id = url.searchParams.get('project_id');
    const user_id    = url.searchParams.get('user_id');
    if (!project_id && !user_id) return new Response(JSON.stringify({ error: 'project_id or user_id required' }), { status: 400 });

    const filter = project_id
      ? `project_id=eq.${project_id}`
      : `user_id=eq.${encodeURIComponent(user_id)}`;

    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/content_stats?${filter}&select=*&order=posted_at.desc&limit=20`,
      { headers: h }
    );
    const data = await res.json();
    return new Response(JSON.stringify(Array.isArray(data) ? data : []), {
      headers: { 'content-type': 'application/json' }
    });
  }

  // POST — 성과 기록
  if (req.method === 'POST') {
    const body = await req.json();
    const { user_id, project_id, platform, title, views, likes, shares, comments, posted_at } = body;
    if (!user_id || !platform) return new Response(JSON.stringify({ error: '필수 항목 누락' }), { status: 400 });

    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/content_stats`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ user_id, project_id, platform, title, views: +views||0, likes: +likes||0, shares: +shares||0, comments: +comments||0, posted_at: posted_at || undefined }),
    });
    const data = await res.json();
    return new Response(JSON.stringify({ ok: true, data: data[0] }), {
      headers: { 'content-type': 'application/json' }
    });
  }

  return new Response('Method not allowed', { status: 405 });
}
