// api/check-approval.js — 승인 상태 폴링
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });

  const secret = req.headers.get('x-pipeline-secret');
  if (secret !== process.env.PIPELINE_SECRET)
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/approvals?id=eq.${id}&select=status,resolved_at`,
    {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  const data = await res.json();
  if (!data[0]) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });

  return new Response(JSON.stringify(data[0]), {
    headers: { 'content-type': 'application/json' },
  });
}
