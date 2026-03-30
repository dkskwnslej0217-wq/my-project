export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function getOrder(orderId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/kmong_orders?id=eq.${orderId}&select=*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const data = await res.json();
  return data[0];
}

async function updateOrderStatus(orderId, status) {
  const body = status === 'delivered'
    ? { status, delivered_at: new Date().toISOString() }
    : { status };

  await fetch(`${SUPABASE_URL}/rest/v1/kmong_orders?id=eq.${orderId}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

async function regenerateContent(orderContent, serviceType) {
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
      messages: [{
        role: 'user',
        content: `아래 주문에 맞는 고품질 결과물을 이전과 다르게 새로 작성하세요.\n주문: ${orderContent}\n서비스: ${serviceType}`
      }]
    })
  });

  const data = await res.json();
  return data.content?.[0]?.text || '재생성 실패';
}

async function answerCallback(callbackQueryId, text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text })
  });
}

async function sendTelegram(text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text })
  });
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('ok', { status: 200 });

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response('ok', { status: 200 });
  }

  const callback = body?.callback_query;
  if (!callback) return new Response('ok', { status: 200 });

  const { id: callbackQueryId, data } = callback;
  if (!data) return new Response('ok', { status: 200 });

  const [action, orderId] = data.split('_').reduce((acc, part, i) => {
    if (i === 0) acc[0] = part;
    else acc[1] = (acc[1] ? acc[1] + '_' : '') + part;
    return acc;
  }, []);

  const order = await getOrder(orderId);
  if (!order) {
    await answerCallback(callbackQueryId, '주문을 찾을 수 없습니다.');
    return new Response('ok', { status: 200 });
  }

  if (action === 'approve') {
    await updateOrderStatus(orderId, 'delivered');
    await answerCallback(callbackQueryId, '✅ 납품 완료 처리됨');
    await sendTelegram(`✅ 납품 완료\n\n결과물:\n${order.result}`);

  } else if (action === 'regenerate') {
    await answerCallback(callbackQueryId, '✏️ 재생성 중...');
    const newResult = await regenerateContent(order.order_content, order.service_type);

    await fetch(`${SUPABASE_URL}/rest/v1/kmong_orders?id=eq.${orderId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ result: newResult })
    });

    const preview = newResult.slice(0, 300) + (newResult.length > 300 ? '...' : '');
    await sendTelegram(
      `✏️ *재생성 완료*\n\n미리보기:\n${preview}`,
    );

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: '재생성된 결과물을 확인하세요.',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ 납품', callback_data: `approve_${orderId}` },
            { text: '✏️ 재생성', callback_data: `regenerate_${orderId}` },
            { text: '❌ 취소', callback_data: `cancel_${orderId}` }
          ]]
        }
      })
    });

  } else if (action === 'cancel') {
    await updateOrderStatus(orderId, 'cancelled');
    await answerCallback(callbackQueryId, '❌ 취소됨');
    await sendTelegram(`❌ 주문 취소됨 (ID: ${orderId})`);
  }

  return new Response('ok', { status: 200 });
}
