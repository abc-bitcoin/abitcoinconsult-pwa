// =============================================================
// POST /api/deletetoken — Remove a single FCM token from KV
// =============================================================
// Called when a user disables notifications on their device.
// No password needed — the token itself is the credential.
// =============================================================

export async function onRequestPost(context) {
  try {
    var body = await context.request.json();
    var token = body.token;

    if (!token || typeof token !== 'string' || token.length < 20) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    var kv = context.env.ABC_TOKENS;
    await kv.delete(token);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
