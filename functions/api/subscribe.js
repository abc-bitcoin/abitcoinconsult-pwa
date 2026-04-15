// =============================================================
// POST /api/subscribe — Save newsletter email to KV
// =============================================================
export async function onRequestPost(context) {
  try {
    var body = await context.request.json();
    var email = (body.email || '').trim().toLowerCase();

    if (!email || email.indexOf('@') < 1) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    var kv = context.env.ABC_TOKENS;
    await kv.put('email_' + email, JSON.stringify({
      email: email,
      subscribedAt: new Date().toISOString()
    }));

    return new Response(JSON.stringify({ ok: true, email: email }), {
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
