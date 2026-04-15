// =============================================================
// POST /api/cleartokens — Delete all FCM tokens from KV (admin only)
// =============================================================
// Used to reset duplicate token registrations that cause
// multiple push notifications per send.
// =============================================================

export async function onRequestPost(context) {
  try {
    var body = await context.request.json();
    var password = (body.password || '').trim();
    var adminPw = (context.env.ADMIN_PASSWORD || '').trim();

    if (!password || password !== adminPw) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        hint: 'Password length received: ' + password.length
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    var kv = context.env.ABC_TOKENS;
    var list = await kv.list();
    var deleted = 0;

    for (var i = 0; i < list.keys.length; i++) {
      var key = list.keys[i].name;
      // Only delete FCM tokens — not posts (post_), emails (email_), or summaries (summary_)
      if (key.indexOf('post_') !== 0 &&
          key.indexOf('email_') !== 0 &&
          key.indexOf('summary_') !== 0) {
        await kv.delete(key);
        deleted++;
      }
    }

    return new Response(JSON.stringify({ ok: true, deleted: deleted }), {
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
