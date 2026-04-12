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
//   - FCM_SERVER_KEY (secret - Firebase Cloud Messaging server key)
// =============================================================

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

      // R2 public URL (needs public access enabled on the bucket)
      // Format: https://pub-{hash}.r2.dev/{key}
      // Or via custom domain if configured
      // For now we'll use the site-relative path served by a R2 binding
      imageUrl = '/images/' + key;
    }

    // --- 3. Fetch all FCM tokens from KV ---
    var kv = context.env.ABC_TOKENS;
    var tokenList = await kv.list();
    var tokens = tokenList.keys.map(function(k) { return k.name; });

    if (tokens.length === 0) {
      return new Response(JSON.stringify({
        ok: true,
        message: 'No subscribers yet — notification not sent',
        imageUrl: imageUrl
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // --- 4. Send push notification via FCM legacy HTTP API ---
    // Using the legacy API because it's simpler (just needs a server key)
    // and supports sending to multiple tokens in one request.
    var fcmKey = context.env.FCM_SERVER_KEY;
    var sent = 0;
    var failed = 0;
    var staleTokens = [];

    // FCM legacy API supports max 1000 tokens per request
    // Send in batches if needed
    var batchSize = 1000;
    for (var i = 0; i < tokens.length; i += batchSize) {
      var batch = tokens.slice(i, i + batchSize);

      var fcmPayload = {
        registration_ids: batch,
        notification: {
          title: 'A Bitcoin Consult',
          body: caption.substring(0, 100),
          icon: '/icons/icon-192.png',
          click_action: '/'
        },
        data: {
          title: 'A Bitcoin Consult',
          body: caption,
          image: imageUrl,
          url: '/',
          timestamp: String(Date.now())
        }
      };

      var fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': 'key=' + fcmKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fcmPayload)
      });

      var fcmResult = await fcmResponse.json();

      if (fcmResult.results) {
        for (var j = 0; j < fcmResult.results.length; j++) {
          if (fcmResult.results[j].message_id) {
            sent++;
          } else {
            failed++;
            // Clean up invalid/expired tokens
            if (fcmResult.results[j].error === 'NotRegistered' ||
                fcmResult.results[j].error === 'InvalidRegistration') {
              staleTokens.push(batch[j]);
            }
          }
        }
      }
    }

    // Remove stale tokens from KV
    for (var s = 0; s < staleTokens.length; s++) {
      await kv.delete(staleTokens[s]);
    }

    // --- 5. Save post to KV for the feed ---
    var postData = {
      caption: caption,
      image: imageUrl,
      timestamp: new Date().toISOString(),
      sent: sent,
      failed: failed
    };
    await kv.put('post_' + Date.now(), JSON.stringify(postData));

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
