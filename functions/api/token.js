// =============================================================
// POST /api/token — Save an FCM device token to Cloudflare KV
// =============================================================
// Stores one token per device. Uses a client-generated deviceId
// to ensure only ONE token exists per device — preventing
// duplicate push notifications.
//
// Cloudflare KV binding: ABC_TOKENS
// =============================================================

export async function onRequestPost(context) {
  try {
    var body = await context.request.json();
    var token = body.token;
    var deviceId = body.deviceId || '';
    var oldToken = body.oldToken || '';

    if (!token || typeof token !== 'string' || token.length < 20) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    var kv = context.env.ABC_TOKENS;

    // Delete the old token if provided
    if (oldToken && typeof oldToken === 'string' && oldToken !== token && oldToken.length > 20) {
      try { await kv.delete(oldToken); } catch(e) {}
    }

    // If we have a deviceId, find and delete ANY other tokens from this device
    // This is the key deduplication step — ensures 1 token per device
    if (deviceId && deviceId.length > 5) {
      try {
        var list = await kv.list();
        for (var i = 0; i < list.keys.length; i++) {
          var key = list.keys[i].name;
          // Skip non-token entries
          if (key.indexOf('post_') === 0 || key.indexOf('email_') === 0 || key.indexOf('summary_') === 0) continue;
          // Skip the token we're about to save
          if (key === token) continue;
          // Check if this token belongs to the same device
          try {
            var val = await kv.get(key, 'json');
            if (val && val.deviceId === deviceId) {
              await kv.delete(key);
            }
          } catch(e) {}
        }
      } catch(e) {}
    }

    // Store the new token with deviceId
    await kv.put(token, JSON.stringify({
      registered: new Date().toISOString(),
      deviceId: deviceId,
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
