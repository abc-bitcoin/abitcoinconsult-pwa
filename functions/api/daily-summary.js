// =============================================================
// GET /api/daily-summary?date=2026-04-13 — AI-generated day headline
// =============================================================
// Looks up all posts for the given date, sends their captions to
// Claude, and returns a short blurb summarizing the day's news.
// Results are cached in KV so the API is only called once per day.
//
// Bindings needed:
//   - ABC_TOKENS (KV)  — where posts are stored as post_* keys
//   - ANTHROPIC_API_KEY (secret)
// =============================================================

export async function onRequestGet(context) {
  try {
    var url = new URL(context.request.url);
    var dateParam = url.searchParams.get('date');
    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid date param (YYYY-MM-DD)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    var kv = context.env.ABC_TOKENS;

    // Check cache first
    var cacheKey = 'summary_' + dateParam;
    var cached = await kv.get(cacheKey);
    if (cached) {
      return new Response(JSON.stringify({ summary: cached, cached: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Gather all posts for this date
    var list = await kv.list({ prefix: 'post_' });
    var captions = [];

    for (var i = 0; i < list.keys.length; i++) {
      var val = await kv.get(list.keys[i].name, 'json');
      if (!val || !val.timestamp) continue;

      // Extract YYYY-MM-DD from the post timestamp
      var d = new Date(val.timestamp);
      var postDate = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');

      if (postDate === dateParam && val.caption) {
        captions.push(val.caption);
      }
    }

    if (captions.length === 0) {
      return new Response(JSON.stringify({ summary: '', error: 'No posts found for this date' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Call Anthropic API to generate a short headline
    var apiKey = context.env.ANTHROPIC_API_KEY;
    var systemPrompt = 'You are the headline writer for "A Bitcoin Consult," a curated Bitcoin insights feed. ' +
      'Given the captions from today\'s posts, write ONE short, punchy headline (max 60 characters) that captures the day\'s theme. ' +
      'No quotes, no hashtags, no emojis. Just the headline text. Examples of good headlines: ' +
      '"ETF inflows surge as whales accumulate" or "Regulation fears meet record hash rate" or "Lightning adoption hits new milestone"';

    var userMsg = 'Here are today\'s post captions:\n\n';
    for (var j = 0; j < captions.length; j++) {
      userMsg += (j + 1) + '. ' + captions[j] + '\n\n';
    }
    userMsg += 'Write a single short headline summarizing the day\'s Bitcoin news theme.';

    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 80,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    var result = await response.json();
    var summary = '';

    if (result.content && result.content[0] && result.content[0].text) {
      summary = result.content[0].text.trim();
    }

    // Cache the summary in KV (expires in 7 days)
    if (summary) {
      await kv.put(cacheKey, summary, { expirationTtl: 604800 });
    }

    return new Response(JSON.stringify({ summary: summary, cached: false }), {
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
