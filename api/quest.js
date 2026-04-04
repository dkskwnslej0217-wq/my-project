export const config = { runtime: 'edge' };

const QUESTS = [
  { id: 'q1', icon: '🌱', title: '첫 프로젝트 시작', desc: '자동화할 문제를 프로젝트로 만들어보세요', reward: 0.10, type: 'auto' },
  { id: 'q2', icon: '💬', title: '깊게 탐구하기',    desc: 'NOVA와 10번 대화해보세요',              reward: 0.15, type: 'chat', target: 10 },
  { id: 'q3', icon: '📝', title: '프로젝트 노트',    desc: '프로젝트에 진행 상황을 기록하세요',      reward: 0.10, type: 'note' },
  { id: 'q4', icon: '👥', title: '첫 초대',          desc: '친구 1명을 우주로 초대하세요',            reward: 0.20, type: 'invite', target: 1 },
  { id: 'q5', icon: '🔥', title: '연속 탐구',        desc: 'NOVA와 50번 대화해보세요',               reward: 0.20, type: 'chat', target: 50 },
  { id: 'q6', icon: '🌟', title: '클러스터 탐험',    desc: '같은 문제를 가진 사람들을 만나보세요',    reward: 0.15, type: 'manual' },
  { id: 'q7', icon: '🚀', title: '3명 초대',         desc: '3명을 초대해서 별을 성장시키세요',        reward: 0.30, type: 'invite', target: 3 },
];

const SUPA_HEADERS = (env) => ({
  'apikey': env.SUPABASE_KEY,
  'Authorization': `Bearer ${env.SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
});

export default async function handler(req) {
  const env = { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY };
  const headers = SUPA_HEADERS(env);
  const url = new URL(req.url);

  // GET — 퀘스트 현황
  if (req.method === 'GET') {
    const user_id = url.searchParams.get('user_id');
    if (!user_id) return new Response(JSON.stringify({ error: 'user_id required' }), { status: 400 });

    // 유저 데이터
    const [userRes, completedRes] = await Promise.all([
      fetch(`${env.SUPABASE_URL}/rest/v1/users?user_id=eq.${encodeURIComponent(user_id)}&select=total_chat_count,invite_count,star_size`, { headers }),
      fetch(`${env.SUPABASE_URL}/rest/v1/user_quests?user_id=eq.${encodeURIComponent(user_id)}&select=quest_id,completed_at`, { headers }),
    ]);
    const [userData] = await userRes.json();
    const completedData = await completedRes.json();
    const completedMap = Object.fromEntries(completedData.map(q => [q.quest_id, q.completed_at]));

    const chatCount = userData?.total_chat_count || 0;
    const inviteCount = userData?.invite_count || 0;

    // 자동 완료 체크 — chat/invite 퀘스트
    const toComplete = [];
    for (const q of QUESTS) {
      if (completedMap[q.id]) continue;
      if (q.type === 'chat' && chatCount >= q.target) toComplete.push(q);
      if (q.type === 'invite' && inviteCount >= q.target) toComplete.push(q);
    }

    // 자동 완료 처리
    if (toComplete.length > 0) {
      let rewardTotal = 0;
      for (const q of toComplete) {
        await fetch(`${env.SUPABASE_URL}/rest/v1/user_quests`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=minimal,resolution=ignore-duplicates' },
          body: JSON.stringify({ user_id, quest_id: q.id })
        });
        completedMap[q.id] = new Date().toISOString();
        rewardTotal += q.reward;
      }
      if (rewardTotal > 0) {
        const newSize = parseFloat(((userData?.star_size || 1.0) + rewardTotal).toFixed(2));
        await fetch(`${env.SUPABASE_URL}/rest/v1/users?user_id=eq.${user_id}`, {
          method: 'PATCH', headers,
          body: JSON.stringify({ star_size: newSize })
        });
      }
    }

    const quests = QUESTS.map(q => {
      let progress = 0;
      if (q.type === 'chat') progress = Math.min(chatCount, q.target || 1);
      if (q.type === 'invite') progress = Math.min(inviteCount, q.target || 1);
      return {
        ...q,
        completed: !!completedMap[q.id],
        completed_at: completedMap[q.id] || null,
        progress,
      };
    });

    return new Response(JSON.stringify({
      quests,
      stats: { chat: chatCount, invite: inviteCount, star_size: userData?.star_size || 1.0 },
      new_completions: toComplete.map(q => q.id),
    }), { headers: { 'content-type': 'application/json' } });
  }

  // POST — 수동 퀘스트 완료 (q3 노트, q6 클러스터)
  if (req.method === 'POST') {
    const token = req.headers.get('x-session-token');
    if (!token) return new Response(JSON.stringify({ error: '인증 필요' }), { status: 401 });

    const body = await req.json();
    const { user_id, quest_id } = body;
    if (!user_id || !quest_id) return new Response(JSON.stringify({ error: '필수 항목 누락' }), { status: 400 });

    const sessRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/sessions?token=eq.${encodeURIComponent(token)}&select=user_id,expires_at`,
      { headers }
    );
    const sessData = await sessRes.json();
    if (!sessData[0] || new Date(sessData[0].expires_at) < new Date())
      return new Response(JSON.stringify({ error: '세션 만료' }), { status: 401 });
    if (sessData[0].user_id !== user_id)
      return new Response(JSON.stringify({ error: '권한 없음' }), { status: 403 });

    const quest = QUESTS.find(q => q.id === quest_id);
    if (!quest) return new Response(JSON.stringify({ error: '퀘스트 없음' }), { status: 404 });

    await fetch(`${env.SUPABASE_URL}/rest/v1/user_quests`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation,resolution=ignore-duplicates' },
      body: JSON.stringify({ user_id, quest_id })
    });

    // 별 성장 보상
    const userRes = await fetch(`${env.SUPABASE_URL}/rest/v1/users?user_id=eq.${user_id}&select=star_size`, { headers });
    const [ud] = await userRes.json();
    const newSize = parseFloat(((ud?.star_size || 1.0) + quest.reward).toFixed(2));
    await fetch(`${env.SUPABASE_URL}/rest/v1/users?user_id=eq.${user_id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ star_size: newSize })
    });

    return new Response(JSON.stringify({ ok: true, reward: quest.reward, new_star_size: newSize }), {
      headers: { 'content-type': 'application/json' }
    });
  }

  return new Response('Method not allowed', { status: 405 });
}
