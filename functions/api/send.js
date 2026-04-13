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
    var caption = formData.get('caption');
    var imageFile = formData.get('image');

    // --- 1. Verify admin password ---
    if (!password || password !== context.env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
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
    // IMPORTANT: Filter out post_ keys — those are saved posts, not FCM tokens
    var kv = context.env.ABC_TOKENS;
    var tokenList = await kv.list();
    var tokens = [];
    for (var t = 0; t < tokenList.keys.length; t++) {
      var keyName = tokenList.keys[t].name;
      if (keyName.indexOf('post_') !== 0) {
        tokens.push(keyName);
      }
    }

    if (tokens.length === 0) {
      // Still save the post even if no subscribers yet
      await kv.put('post_' + Date.now(), JSON.stringify({
        caption: caption,
        image: imageUrl,
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

    // Send in parallel batches of 50 to avoid overwhelming the worker
    var batchSize = 50;
    for (var i = 0; i < tokens.length; i += batchSize) {
      var batch = tokens.slice(i, i + batchSize);
      var results = await Promise.all(
        batch.map(function(token) {
          return sendOneNotification(token, title, caption.substring(0, 100), imageUrl, projectId, accessToken);
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
