// =============================================================
// POST /api/send — Admin endpoint to send a push notification
// =============================================================
// Accepts: multipart/form-data with:
//   - image: the tweet screenshot file
//   - caption: text commentary
//   - password: admin password
//
// Steps:
//   1. Verify admin password
//   2. Upload image to Cloudflare R2
//   3. Fetch all FCM tokens from KV
//   4. Send push notification via FCM HTTP v1 API
//
// Bindings needed:
//   - ABC_TOKENS (KV namespace for device tokens)
//   - ABC_IMAGES (R2 bucket for screenshots)
//   - ADMIN_PASSWORD (secret)
//   - FIREBASE_SERVICE_ACCOUNT (secret - full JSON string from Firebase service account key)
// =============================================================

// ---- FCM v1 API helpers ----

// Convert PEM private key string to DER ArrayBuffer
function pemToDer(pem) {
  var base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  var binary = atob(base64);
  var der = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) {
    der[i] = binary.charCodeAt(i);
  }
  return der.buffer;
}

// Base64url encode a buffer or Uint8Array
function base64url(input) {
  var bytes;
  if (input instanceof ArrayBuffer) {
    bytes = new Uint8Array(input);
  } else if (input instanceof Uint8Array) {
    bytes = input;
  } else {
    bytes = input;
  }
  var str = '';
  for (var i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Build a JWT and exchange it for a Google OAuth2 access token
async function getAccessToken(serviceAccount) {
  var now = Math.floor(Date.now() / 1000);
  var encoder = new TextEncoder();

  var header = { alg: 'RS256', typ: 'JWT' };
  var payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  var headerB64 = base64url(encoder.encode(JSON.stringify(header)));
  var payloadB64 = base64url(encoder.encode(JSON.stringify(payload)));
  var signingInput = headerB64 + '.' + payloadB64;

  var privateKeyDer = pemToDer(serviceAccount.private_key);
  var cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  var signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signingInput)
  );

  var jwt = signingInput + '.' + base64url(signatureBuffer);

  var tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt
  });

  var tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error('Failed to get FCM access token: ' + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}

// Send FCM v1 notification to a single device token
async function sendOneNotification(deviceToken, title, body, imageUrl, projectId, accessToken) {
  var message = {
    message: {
      token: deviceToken,
      notification: {
        title: title,
        body: body
      },
      webpush: {
        notification: {
          icon: '/icons/icon-192.png',
          image: imageUrl || undefined
        },
        fcm_options: {
          link: '/'
        }
      },
      data: {
        title: title,
        body: body,
        image: imageUrl || '',
        url: '/',
        timestamp: String(Date.now())
      }
    }
  };

  var response = await fetch(
    'https://fcm.googleapis.com/v1/projects/' + projectId + '/messages:send',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    }
  );

  var result = await response.json();
  return { token: deviceToken, status: response.status, result: result };
}

// ---- Main handler ----

export async function onRequestPost(context) {
  try {
    var formData = await context.request.formData();
    var password = formData.get('password');
    var action = formData.get('action') || '';
    var caption = formData.get('caption');
    var imageFile = formData.get('image');
    var username = (formData.get('username') || '').trim();

    // --- 1. Verify admin password ---
    if (!password || password !== context.env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // --- CLEAR TOKENS action ---
    if (action === 'cleartokens') {
      var kv2 = context.env.ABC_TOKENS;
      var list2 = await kv2.list();
      var deleted = 0;
      for (var d = 0; d < list2.keys.length; d++) {
        var k = list2.keys[d].name;
        if (k.indexOf('post_') !== 0 && k.indexOf('email_') !== 0 && k.indexOf('summary_') !== 0) {
          await kv2.delete(k);
          deleted++;
        }
      }
      return new Response(JSON.stringify({ ok: true, deleted: deleted }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // --- DELETE POST action ---
    if (action === 'deletepost') {
      var postId = formData.get('postId') || '';
      if (!postId || postId.indexOf('post_') !== 0) {
        return new Response(JSON.stringify({ error: 'Invalid post ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      var kv3 = context.env.ABC_TOKENS;
      await kv3.delete(postId);
      return new Response(JSON.stringify({ ok: true, deleted: postId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!caption) {
      return new Response(JSON.stringify({ error: 'Caption is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // --- 2. Upload image to R2 ---
    var imageUrl = '';
    if (imageFile && imageFile.size > 0) {
      var timestamp = Date.now();
      var ext = imageFile.name.split('.').pop() || 'png';
      var key = 'posts/' + timestamp + '.' + ext;

      await context.env.ABC_IMAGES.put(key, imageFile.stream(), {
        httpMetadata: {
          contentType: imageFile.type || 'image/png'
        }
      });

      imageUrl = '/images/' + key;
    }

    // --- 3. Fetch all FCM tokens from KV ---
    // Filter out non-token keys (post_, email_, summary_)
    var kv = context.env.ABC_TOKENS;
    var tokenList = await kv.list();
    var allTokens = [];
    for (var t = 0; t < tokenList.keys.length; t++) {
      var keyName = tokenList.keys[t].name;
      if (keyName.indexOf('post_') === 0 ||
          keyName.indexOf('email_') === 0 ||
          keyName.indexOf('summary_') === 0) {
        continue; // skip non-token entries
      }
      allTokens.push(keyName);
    }

    // Deduplicate: read each token's registration data and keep only
    // the most recently registered token per device (user-agent).
    // This prevents sending 3 notifications to the same phone.
    var tokensByDevice = {};
    for (var td = 0; td < allTokens.length; td++) {
      try {
        var tokenData = await kv.get(allTokens[td], 'json');
        var ua = (tokenData && tokenData.ua) ? tokenData.ua : 'unknown';
        var reg = (tokenData && tokenData.registered) ? tokenData.registered : '1970-01-01';
        // Use a short UA fingerprint as a device key (first 80 chars)
        var deviceKey = ua.substring(0, 80);
        if (!tokensByDevice[deviceKey] || reg > tokensByDevice[deviceKey].reg) {
          tokensByDevice[deviceKey] = { token: allTokens[td], reg: reg };
        }
      } catch(e) {
        // If we can't read the token data, still include it
        tokensByDevice['fallback_' + td] = { token: allTokens[td], reg: '1970-01-01' };
      }
    }

    // Build final deduplicated token list
    var tokens = [];
    var deviceKeys = Object.keys(tokensByDevice);
    for (var dk = 0; dk < deviceKeys.length; dk++) {
      tokens.push(tokensByDevice[deviceKeys[dk]].token);
    }

    if (tokens.length === 0) {
      // Still save the post even if no subscribers yet
      await kv.put('post_' + Date.now(), JSON.stringify({
        caption: caption,
        image: imageUrl,
        username: username,
        timestamp: new Date().toISOString(),
        sent: 0,
        failed: 0
      }));

      return new Response(JSON.stringify({
        ok: true,
        sent: 0,
        failed: 0,
        staleRemoved: 0,
        totalSubscribers: 0,
        message: 'Post saved — no subscribers yet',
        imageUrl: imageUrl
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // --- 4. Send push notifications via FCM v1 API ---
    var serviceAccountJson = context.env.FIREBASE_SERVICE_ACCOUNT;
    var serviceAccount = JSON.parse(serviceAccountJson);
    var projectId = serviceAccount.project_id;

    // Get OAuth2 access token
    var accessToken = await getAccessToken(serviceAccount);

    var title = 'A Bitcoin Consult';
    var sent = 0;
    var failed = 0;
    var staleTokens = [];

    // Clean up the caption for the push notification body:
    // The AI caption may start with "Push: ..." or "In-app: ..." prefixes — strip them
    var notifBody = caption;
    // Remove "Push:" prefix and everything before "In-app:" if present
    if (notifBody.indexOf('Push:') === 0) {
      notifBody = notifBody.replace(/^Push:\s*/, '');
    }
    // If there's an "In-app:" section, only use the text before it for the notification
    var inAppIdx = notifBody.indexOf('In-app:');
    if (inAppIdx > 0) {
      notifBody = notifBody.substring(0, inAppIdx).trim();
    }
    // Truncate to 150 chars for the notification preview
    if (notifBody.length > 150) {
      notifBody = notifBody.substring(0, 147) + '...';
    }

    // Send in parallel batches of 50 to avoid overwhelming the worker
    var batchSize = 50;
    for (var i = 0; i < tokens.length; i += batchSize) {
      var batch = tokens.slice(i, i + batchSize);
      var results = await Promise.all(
        batch.map(function(token) {
          return sendOneNotification(token, title, notifBody, imageUrl, projectId, accessToken);
        })
      );

      for (var j = 0; j < results.length; j++) {
        var r = results[j];
        if (r.status === 200) {
          sent++;
        } else {
          failed++;
          // Remove unregistered/invalid tokens
          if (r.result && r.result.error) {
            var errCode = r.result.error.status || '';
            if (errCode === 'UNREGISTERED' || errCode === 'INVALID_ARGUMENT') {
              staleTokens.push(r.token);
            }
          }
        }
      }
    }

    // Remove stale tokens from KV
    for (var s = 0; s < staleTokens.length; s++) {
      await kv.delete(staleTokens[s]);
    }

    // --- 5. Save post record to KV for the feed ---
    await kv.put('post_' + Date.now(), JSON.stringify({
      caption: caption,
      image: imageUrl,
      username: username,
      timestamp: new Date().toISOString(),
      sent: sent,
      failed: failed
    }));

    return new Response(JSON.stringify({
      ok: true,
      sent: sent,
      failed: failed,
      staleRemoved: staleTokens.length,
      totalSubscribers: tokens.length,
      imageUrl: imageUrl
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
