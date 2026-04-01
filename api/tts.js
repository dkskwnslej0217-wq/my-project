// api/tts.js — ElevenLabs TTS 프록시
// POST { text, voice_id? } → MP3 오디오 스트림 반환
// Make.com이 이 엔드포인트 호출 → 오디오 파일 받아서 영상 합성에 사용

export const config = { runtime: 'edge' };

const DEFAULT_VOICE = 'EXAVITQu4vr4xnSDxMaL'; // ElevenLabs 기본 한국어 친화 목소리 (Sarah)
const MAX_CHARS = 2500;

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // 내부 파이프라인 또는 Make.com만 허용
  const secret = req.headers.get('x-pipeline-secret');
  if (secret !== process.env.PIPELINE_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: '잘못된 요청' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const text = (body.text ?? '').trim().slice(0, MAX_CHARS);
  if (!text) {
    return new Response(JSON.stringify({ error: 'text 필드 필요' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const voiceId = body.voice_id ?? DEFAULT_VOICE;
  const apiKey  = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    // ElevenLabs 키 없으면 Google TTS 폴백
    return googleTtsFallback(text, req);
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ElevenLabs ${res.status}: ${err}`);
    }

    // 오디오 스트림 그대로 반환
    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="nova_tts.mp3"',
        'X-TTS-Provider': 'elevenlabs',
      },
    });

  } catch (e) {
    // ElevenLabs 실패 → Google TTS 폴백
    console.error('ElevenLabs 실패, Google TTS 폴백:', e.message);
    return googleTtsFallback(text, req);
  }
}

// ─── Google TTS 폴백 ──────────────────────────────────────
async function googleTtsFallback(text, _req) {
  const apiKey = process.env.GOOGLE_TTS_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'TTS 키 없음 (ElevenLabs + Google TTS 모두 미설정)' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: 'ko-KR', name: 'ko-KR-Neural2-C', ssmlGender: 'FEMALE' },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 1.05 },
        }),
      }
    );

    if (!res.ok) throw new Error(`Google TTS ${res.status}`);
    const data = await res.json();

    // base64 → binary
    const binary = Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0));
    return new Response(binary, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="nova_tts.mp3"',
        'X-TTS-Provider': 'google',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: `TTS 실패: ${e.message}` }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
