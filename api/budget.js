export const config = { runtime: 'edge' };

export default async function handler(_req) {
  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;

  try {
    // 유저 플랜별 집계
    const [usersRes, configRes] = await Promise.all([
      fetch(`${SUPA_URL}/rest/v1/users?select=plan,daily_count`, {
        headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
      }),
      fetch(`${SUPA_URL}/rest/v1/platform_config?id=eq.1&select=active_model,total_users`, {
        headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
      }),
    ]);

    const users = await usersRes.json();
    const config = await configRes.json();

    const planCounts = { free: 0, starter: 0, pro: 0 };
    let totalChats = 0;
    for (const u of (Array.isArray(users) ? users : [])) {
      const plan = u.plan || 'free';
      if (plan in planCounts) planCounts[plan]++;
      totalChats += u.daily_count || 0;
    }

    const totalUsers = planCounts.free + planCounts.starter + planCounts.pro;
    const monthlyRevenue = planCounts.starter * 4900 + planCounts.pro * 14900;
    const activeModel = config[0]?.active_model ?? 'groq-70b';

    // 플랫폼 레벨 계산
    let platformLevel = 1;
    if (totalUsers >= 500) platformLevel = 4;
    else if (totalUsers >= 200) platformLevel = 3;
    else if (totalUsers >= 50) platformLevel = 2;

    const modelLabels = {
      'groq-70b': 'Groq Llama 70B (무료)',
      'claude-haiku': 'Claude Haiku',
      'claude-sonnet': 'Claude Sonnet',
      'claude-opus': 'Claude Opus',
    };

    return new Response(JSON.stringify({
      totalUsers,
      planCounts,
      monthlyRevenue,
      platformLevel,
      activeModel,
      activeModelLabel: modelLabels[activeModel] ?? activeModel,
      allocation: {
        junho: Math.floor(monthlyRevenue * 0.6),
        api: Math.floor(monthlyRevenue * 0.2),
        growth: Math.floor(monthlyRevenue * 0.2),
      },
      todayChats: totalChats,
    }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
