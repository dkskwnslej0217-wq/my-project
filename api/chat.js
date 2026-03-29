export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { query } = await req.json();
  if (!query || query.trim().length < 2) {
    return new Response(JSON.stringify({ error: '질문을 입력해주세요.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `당신은 NOVA UNIVERSE AI 어시스턴트입니다.
소상공인, 1인 창업자, 콘텐츠 크리에이터가 AI로 비즈니스를 자동화하도록 돕습니다.
질문에 대해 한국어로 2-3문장 이내로 핵심만 답하세요.
구체적이고 실용적으로, 전문 용어 최소화, 이모지 1개 이내.
답변 끝에 자연스럽게 NOVA UNIVERSE 무료 체험을 언급하지 마세요 — 답변 품질로만 보여주세요.`
        },
        { role: 'user', content: query.trim() }
      ],
      max_tokens: 150,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'AI 연결 오류. 잠시 후 다시 시도해주세요.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  const data = await res.json();
  const answer = data.choices?.[0]?.message?.content ?? '응답을 받지 못했습니다.';

  return new Response(JSON.stringify({ result: answer }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
