export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function generateContent(orderContent, serviceType) {
  const prompts = {
    blog: `당신은 전문 블로그 작가입니다. 아래 주문 내용을 바탕으로 SEO 최적화된 블로그 포스팅을 작성하세요.
주문: ${orderContent}
조건: 1500자 이상, 자연스러운 문체, 소제목 포함, 광고성 문구 금지`,

    detail: `당신은 쇼핑몰 상세페이지 전문 카피라이터입니다. 아래 주문 내용으로 상세페이지 문구를 작성하세요.
주문: ${orderContent}
조건: 구매 욕구를 자극하는 문체, 특장점 3가지 이상, 자연스러운 CTA 포함`,

    script: `당신은 유튜브 스크립트 전문가입니다. 아래 주문 내용으로 영상 스크립트를 작성하세요.
주문: ${orderContent}
조건: 후킹 인트로, 본론 3파트, 아웃트로 포함, 구어체 사용`,

    sns: `당신은 SNS 콘텐츠 전문가입니다. 아래 주문 내용으로 인스타그램 캡션을 작성하세요.
주문: ${orderContent}
조건: 200자 이내, 해시태그 10개, 이모지 자연스럽게 포함`,

    press: `당신은 보도자료 전문 작가입니다. 아래 주문 내용으로 보도자료를 작성하세요.
주문: ${orderContent}
조건: 역피라미드 구조, 육하원칙 포함, 공식적 문체, 1000자 이상`,

    default: `아래 주문 내용에 맞는 전문적인 결과물을 작성하세요.
주문: ${orderContent}
조건: 고품질, 자연스러운 문체, 주문 내용과 정확히 일치`
  };

  const prompt = prompts[serviceType] || prompts.default;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await res.json();
  return data.content?.[0]?.text || '생성 실패';
}

async function scoreContent(content) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `아래 콘텐츠를 품질 기준으로 0~100점 채점하세요. 숫자만 출력하세요.\n\n${content.slice(0, 500)}`
      }]
    })
  });

  const data = await res.json();
  const score = parseInt(data.content?.[0]?.text?.trim()) || 0;
  return score;
}

async function sendTelegram(orderId, orderContent, serviceType, result) {
  const preview = result.slice(0, 300) + (result.length > 300 ? '...' : '');
  const message = `📦 *새 크몽 주문*\n\n` +
    `*서비스:* ${serviceType}\n` +
    `*주문 내용:* ${orderContent.slice(0, 100)}\n\n` +
    `*생성 결과 미리보기:*\n${preview}`;

  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ 납품', callback_data: `approve_${orderId}` },
          { text: '✏️ 재생성', callback_data: `regenerate_${orderId}` },
          { text: '❌ 취소', callback_data: `cancel_${orderId}` }
        ]]
      }
    })
  });
}

async function saveOrder(orderContent, serviceType, result, status) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/kmong_orders`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'content-type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ order_content: orderContent, service_type: serviceType, result, status })
  });

  const data = await res.json();
  return data[0]?.id;
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { order_content, service_type = 'default' } = body;
  if (!order_content) return new Response('order_content required', { status: 400 });

  // 1차 생성
  let result = await generateContent(order_content, service_type);

  // 품질 채점 — 70점 이하 재생성 1회
  let score = await scoreContent(result);
  if (score < 70) {
    result = await generateContent(order_content, service_type);
    score = await scoreContent(result);
  }

  // Supabase 저장
  const orderId = await saveOrder(order_content, service_type, result, 'pending');

  // Telegram 전송
  await sendTelegram(orderId, order_content, service_type, result);

  return new Response(JSON.stringify({ ok: true, orderId, score }), {
    headers: { 'content-type': 'application/json' }
  });
}
