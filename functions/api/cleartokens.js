// =============================================================
// POST /api/cleartokens — Delete all FCM tokens from KV (admin only)
// =============================================================
// Used to reset duplicate token registrations that cause
// multiple push notifications per send.
// =============================================================

export async function onRequestPost(context) {
  try {
    // Parse password from any format — JSON, FormData, or URL-encoded
    var password = '';
    try {
      var ct = (context.request.headers.get('content-type') || '').toLowerCase();
      if (ct.indexOf('json') >= 0) {
        var body = await context.request.json();
        password = (body.password || '').trim();
      } else {
        var formData = await context.request.formData();
        password = (formData.get('password') || '').trim();
      }
    } catch(pe) {
      // Last resort: try reading as text
      try {
        var txt = await context.request.text();
        var match = txt.match(/password=([^&]*)/);
        if (match) password = decodeURIComponent(match[1]).trim();
      } catch(e2) {}
    }

    var adminPw = context.env.ADMIN_PASSWORD;
    var adminExists = typeof adminPw === 'string';
    var adminLen = adminExists ? adminPw.length : -1;

    if (!password || !adminExists || password !== adminPw) {
      // Return debug info so we can figure out the mismatch
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        debug: {
          receivedLen: password.length,
          storedLen: adminLen,
          storedExists: adminExists,
          match: password === adminPw,
          receivedFirst2: password.substring(0, 2),
          storedFirst2: adminExists ? adminPw.substring(0, 2) : 'N/A'
        }
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
