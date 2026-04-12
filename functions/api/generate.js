// =============================================================
// POST /api/generate — Generate an AI caption for a tweet
// =============================================================
// Accepts JSON: { tweet: "...", password: "..." }
// Returns JSON: { caption: "..." }
//
// Uses the Anthropic API (Claude) to generate a concise,
// insightful caption for a Bitcoin/market tweet.
//
// Bindings needed:
//   - ADMIN_PASSWORD (secret)
//   - ANTHROPIC_API_KEY (secret)
// =============================================================

export async function onRequestPost(context) {
  try {
    var body = await context.request.json();
    var password = body.password;
    var tweet = body.tweet;

    // Verify admin password
    if (!password || password !== context.env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!tweet || tweet.length < 5) {
      return new Response(JSON.stringify({ error: 'Tweet text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    var apiKey = context.env.ANTHROPIC_API_KEY;

    var systemPrompt = 'You are the voice of "A Bitcoin Consult" — a curated Bitcoin insights feed. ' +
      'Your job is to write a short, punchy caption (2-3 sentences max) that adds context to a Bitcoin/crypto tweet. ' +
      'Your tone is: informed but accessible, slightly irreverent, no hype or shilling. ' +
      'You explain WHY this tweet matters, not just what it says. ' +
      'Never use hashtags or emojis. Keep it under 200 characters for the push notification preview, ' +
      'but include a slightly longer version (under 500 chars) for the in-app display. ' +
      'Return ONLY the caption text, nothing else.';

    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: 'Write a caption for this tweet:\n\n' + tweet
        }]
      })
    });

    var result = await response.json();

    if (result.content && result.content[0] && result.content[0].text) {
      return new Response(JSON.stringify({ caption: result.content[0].text.trim() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        error: 'AI response was empty',
        raw: JSON.stringify(result).substring(0, 200)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
