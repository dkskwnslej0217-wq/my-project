export const config = { runtime: 'edge' };

const SUPA_HEADERS = (env) => ({
  'apikey': env.SUPABASE_KEY,
  'Authorization': `Bearer ${env.SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
});

// AI 태깅 — 키워드 기반 분류 + LLM fallback
const TAG_RULES = [
  { tag: 'content',      keys: ['콘텐츠','글','영상','유튜브','threads','인스타','포스팅','블로그','뉴스레터','크리에이터','썸네일','스크립트'] },
  { tag: 'ecommerce',    keys: ['쇼핑','가격','판매','구매','상품','재고','스마트스토어','쿠팡','네이버','아마존','주문','결제','배송'] },
  { tag: 'data',         keys: ['데이터','분석','리포트','통계','모니터링','대시보드','엑셀','스프레드시트','크롤링','수집'] },
  { tag: 'customer',     keys: ['고객','응대','문의','챗봇','자동답변','cs','서비스','리뷰','피드백'] },
  { tag: 'productivity', keys: ['일정','알림','이메일','문서','회의','업무','반복','귀찮','자동화','노션','슬랙','지라'] },
  { tag: 'research',     keys: ['학습','공부','리서치','정보','뉴스','트렌드','논문','번역','요약','검색'] },
  { tag: 'marketing',    keys: ['마케팅','광고','seo','키워드','캠페인','소재','전환','클릭','노출','브랜딩'] },
];

const TAG_LABELS = {
  content: '콘텐츠/크리에이터',
  ecommerce: '쇼핑/커머스',
  data: '데이터/분석',
  customer: '고객/서비스',
  productivity: '생산성/업무',
  research: '학습/리서치',
  marketing: '마케팅',
  other: '기타',
};

function classifyTags(text) {
  const lower = text.toLowerCase();
  const matched = [];
  for (const rule of TAG_RULES) {
    if (rule.keys.some(k => lower.includes(k))) matched.push(rule.tag);
  }
  return { primary: matched[0] || 'other', tags: matched.length ? matched : ['other'] };
}

// NOVA가 프로젝트 제목 생성
async function generateProjectTitle(description, env) {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 60,
        messages: [
          { role: 'system', content: '유저의 문제/목표를 듣고 프로젝트 이름을 10자 이내 한국어로만 답하세요. 예: "경쟁사 가격 자동추적" / "주간 매출 리포트 자동화"' },
          { role: 'user', content: description }
        ]
      })
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d.choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}

export default async function handler(req) {
  const env = { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY, GROQ_API_KEY: process.env.GROQ_API_KEY };
  const headers = SUPA_HEADERS(env);
  const url = new URL(req.url);

  // GET /api/project?user_id=xxx — 프로젝트 목록
  // GET /api/project?cluster_tag=xxx — 클러스터 실집계
  if (req.method === 'GET') {
    const cluster_tag = url.searchParams.get('cluster_tag');
    if (cluster_tag) {
      const res = await fetch(
        `${env.SUPABASE_URL}/rest/v1/projects?primary_tag=eq.${encodeURIComponent(cluster_tag)}&select=user_id`,
        { headers }
      );
      const data = await res.json();
      const userIds = [...new Set(data.map(p => p.user_id))];
      const uniqueUsers = userIds.length;
      const totalProjects = data.length;

      // cluster_rank=true 이면 유저 순위도 계산
      const wantRank = url.searchParams.get('cluster_rank') === 'true';
      const req_user = url.searchParams.get('user_id');
      let rank = null;
      if (wantRank && req_user && userIds.length > 0) {
        const uRes = await fetch(
          `${env.SUPABASE_URL}/rest/v1/users?user_id=in.(${userIds.map(id => encodeURIComponent(id)).join(',')})&select=user_id,star_size,total_chat_count`,
          { headers }
        );
        const uData = await uRes.json();
        uData.sort((a, b) => {
          const sA = (a.star_size || 1) * 10 + (a.total_chat_count || 0);
          const sB = (b.star_size || 1) * 10 + (b.total_chat_count || 0);
          return sB - sA;
        });
        const idx = uData.findIndex(u => u.user_id === req_user);
        rank = idx >= 0 ? idx + 1 : uniqueUsers;
      }

      return new Response(JSON.stringify({ count: uniqueUsers, project_count: totalProjects, tag: cluster_tag, rank }), {
        headers: { 'content-type': 'application/json' }
      });
    }

    const user_id = url.searchParams.get('user_id');
    if (!user_id) return new Response(JSON.stringify({ error: 'user_id required' }), { status: 400 });

    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/projects?user_id=eq.${encodeURIComponent(user_id)}&order=created_at.desc`,
      { headers }
    );
    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
  }

  // PATCH /api/project?id=xxx — 노트 업데이트
  if (req.method === 'PATCH') {
    const token = req.headers.get('x-session-token');
    if (!token) return new Response(JSON.stringify({ error: '인증 필요' }), { status: 401 });
    const id = url.searchParams.get('id');
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

    // 소유권 확인
    const sessRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/sessions?token=eq.${encodeURIComponent(token)}&select=user_id,expires_at`,
      { headers }
    );
    const sessData = await sessRes.json();
    if (!sessData[0] || new Date(sessData[0].expires_at) < new Date())
      return new Response(JSON.stringify({ error: '세션 만료' }), { status: 401 });

    const projRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/projects?id=eq.${id}&select=user_id`,
      { headers }
    );
    const projData = await projRes.json();
    if (!projData[0] || projData[0].user_id !== sessData[0].user_id)
      return new Response(JSON.stringify({ error: '권한 없음' }), { status: 403 });

    const body = await req.json();
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/projects?id=eq.${id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ notes: body.notes, updated_at: new Date().toISOString() })
    });
    return new Response(JSON.stringify({ ok: res.ok }), { headers: { 'content-type': 'application/json' } });
  }

  // POST /api/project — 프로젝트 생성
  if (req.method === 'POST') {
    const token = req.headers.get('x-session-token');
    if (!token) return new Response(JSON.stringify({ error: '인증 필요' }), { status: 401 });
    const body = await req.json();
    const { user_id, description } = body;
    if (!user_id || !description?.trim())
      return new Response(JSON.stringify({ error: '필수 항목 누락' }), { status: 400 });

    // 소유권 확인
    const sessRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/sessions?token=eq.${encodeURIComponent(token)}&select=user_id,expires_at`,
      { headers }
    );
    const sessData = await sessRes.json();
    if (!sessData[0] || new Date(sessData[0].expires_at) < new Date())
      return new Response(JSON.stringify({ error: '세션 만료' }), { status: 401 });
    if (sessData[0].user_id !== user_id)
      return new Response(JSON.stringify({ error: '권한 없음' }), { status: 403 });

    const { primary, tags } = classifyTags(description);

    // AI로 프로젝트 제목 생성 (실패 시 description 앞 20자)
    const aiTitle = await generateProjectTitle(description, env);
    const title = aiTitle || description.slice(0, 20);

    // 프로젝트 저장
    const ins = await fetch(`${env.SUPABASE_URL}/rest/v1/projects`, {
      method: 'POST', headers,
      body: JSON.stringify({ user_id, title, description, primary_tag: primary, tags })
    });
    if (!ins.ok) return new Response(JSON.stringify({ error: '프로젝트 생성 실패' }), { status: 500 });
    const [project] = await ins.json();

    // 같은 primary_tag 유저 수 조회 (클러스터 크기)
    const clusterRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/projects?primary_tag=eq.${primary}&select=user_id`,
      { headers }
    );
    const clusterData = await clusterRes.json();
    const uniqueUsers = new Set(clusterData.map(p => p.user_id)).size;

    // 퀘스트 q1(첫 프로젝트) 자동 완료
    await fetch(`${env.SUPABASE_URL}/rest/v1/user_quests`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal,resolution=ignore-duplicates' },
      body: JSON.stringify({ user_id, quest_id: 'q1' })
    });
    // star_size + 0.10 보상
    const userRes = await fetch(`${env.SUPABASE_URL}/rest/v1/users?user_id=eq.${user_id}&select=star_size`, { headers });
    const [userData] = await userRes.json();
    const newSize = parseFloat(((userData?.star_size || 1.0) + 0.10).toFixed(2));
    await fetch(`${env.SUPABASE_URL}/rest/v1/users?user_id=eq.${user_id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ star_size: newSize })
    });

    return new Response(JSON.stringify({
      project,
      cluster: { primary_tag: primary, label: TAG_LABELS[primary], count: uniqueUsers },
      quest_completed: 'q1',
    }), { headers: { 'content-type': 'application/json' } });
  }

  return new Response('Method not allowed', { status: 405 });
}
