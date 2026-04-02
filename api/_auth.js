// api/_auth.js — 세션 토큰 검증 유틸리티

export async function verifySession(token, supaUrl, supaKey) {
  if (!token) return null;
  try {
    const res = await fetch(
      `${supaUrl}/rest/v1/sessions?token=eq.${encodeURIComponent(token)}&select=user_id,expires_at`,
      { headers: { 'apikey': supaKey, 'Authorization': `Bearer ${supaKey}` } }
    );
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) return null;
    if (new Date(data[0].expires_at) < new Date()) return null;
    return data[0].user_id;
  } catch { return null; }
}
