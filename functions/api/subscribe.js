// =============================================================
// POST /api/subscribe — Add email to subscription list
// =============================================================
// Accepts: JSON with:
//   - email: subscriber email address
//
// Steps:
//   1. Validate email format
//   2. Save to KV with email_ prefix
//   3. Add to Mailchimp audience via API
//
// Bindings needed:
//   - ABC_TOKENS (KV namespace for email subscribers)
//   - MAILCHIMP_API_KEY (secret)
//   - MAILCHIMP_AUDIENCE_ID (secret)
// =============================================================

// Helper to validate email
function isValidEmail(email) {
  var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Helper to extract data center from Mailchimp API key
function getDataCenterFromKey(apiKey) {
  // API key format: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us21
  var parts = apiKey.split('-');
  return parts[parts.length - 1] || 'us1';
}

// Helper to add to Mailchimp audience
async function addToMailchimp(email, apiKey, audienceId) {
  var dc = getDataCenterFromKey(apiKey);
  var auth = 'Basic ' + btoa('apikey:' + apiKey);

  var url = 'https://' + dc + '.api.mailchimp.com/3.0/lists/' + audienceId + '/members';

  var body = JSON.stringify({
    email_address: email,
    status: 'subscribed'
  });

  var response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/json'
    },
    body: body
  });

  var result = await response.json();

  // Handle duplicate email (400 with "Member Exists" error)
  if (response.status === 400 && result.title === 'Member Exists') {
    return { status: 'duplicate', message: 'Email already subscribed' };
  }

  if (response.status !== 200 && response.status !== 201) {
    throw new Error('Mailchimp error: ' + (result.detail || result.title || 'Unknown error'));
  }

  return { status: 'success', memberId: result.id };
}

// Main handler
export async function onRequestPost(context) {
  try {
    var contentType = context.request.headers.get('content-type') || '';

    var email = '';

    // Parse JSON body
    if (contentType.includes('application/json')) {
      var jsonData = await context.request.json();
      email = (jsonData.email || '').trim().toLowerCase();
    }

    // Validate email
    if (!email || !isValidEmail(email)) {
      return new Response(JSON.stringify({
        error: 'Invalid email address'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // --- 1. Save to KV ---
    var kv = context.env.ABC_TOKENS;
    var kvKey = 'email_' + email;

    await kv.put(kvKey, JSON.stringify({
      email: email,
      subscribedAt: new Date().toISOString()
    }));

    // --- 2. Add to Mailchimp ---
    var mailchimpResult = null;
    var mailchimpStatus = 'skipped';

    try {
      mailchimpResult = await addToMailchimp(
        email,
        context.env.MAILCHIMP_API_KEY,
        context.env.MAILCHIMP_AUDIENCE_ID
      );

      if (mailchimpResult.status === 'duplicate') {
        mailchimpStatus = 'duplicate';
      } else if (mailchimpResult.status === 'success') {
        mailchimpStatus = 'added';
      }
    } catch (mcErr) {
      // If Mailchimp fails, we still saved to KV, so return a partial success
      console.error('Mailchimp error:', mcErr.message);
      mailchimpStatus = 'error';
    }

    return new Response(JSON.stringify({
      ok: true,
      email: email,
      saved: true,
      mailchimp: mailchimpStatus,
      message: mailchimpStatus === 'duplicate'
        ? 'Email already subscribed'
        : 'Successfully subscribed to weekly digest'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
