// =============================================================
// POST /api/token — Save an FCM device token to Cloudflare KV
// =============================================================
// When a user enables notifications, their browser gets a unique
// FCM token. We store every token in KV so we can send push
// notifications to all subscribers later.
//
// Cloudflare KV binding: ABC_TOKENS
// =============================================================

export async function onRequestPost(context) {
  try {
    var body = await context.request.json();
    var token = body.token;

    if (!token || typeof token !== 'string' || token.length < 20) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Store token in KV. Key = token itself (deduplicates automatically).
    // Value = timestamp of when it was registered.
    var kv = context.env.ABC_TOKENS;
    await kv.put(token, JSON.stringify({
      registered: new Date().toISOString(),
      ua: context.request.headers.get('User-Agent') || 'unknown'
    }));

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
