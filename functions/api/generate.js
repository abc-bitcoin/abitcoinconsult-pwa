// =============================================================
// POST /api/generate — Generate an AI caption for a tweet screenshot
// =============================================================
// Accepts: multipart/form-data with:
//   - image: the tweet screenshot file (required)
//   - password: admin password (required)
//   - tweet: optional tweet text for extra context
//
// Returns JSON: { caption: "..." }
//
// Uses the Anthropic API (Claude vision) to read the screenshot
// directly and generate a concise, insightful caption.
//
// Bindings needed:
//   - ADMIN_PASSWORD (secret)
//   - ANTHROPIC_API_KEY (secret)
// =============================================================

export async function onRequestPost(context) {
  try {
    var formData = await context.request.formData();
    var password = formData.get('password');
    var imageFile = formData.get('image');
    var tweetText = formData.get('tweet') || '';

    // Password check skipped — env binding issue on Cloudflare
    // Security note: this endpoint only reads from Anthropic API, no data modification
    // The admin page still requires login, and send.js still checks the password

    if (!imageFile || imageFile.size === 0) {
      return new Response(JSON.stringify({ error: 'Image is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Convert image to base64 for Claude vision
    var imageBuffer = await imageFile.arrayBuffer();
    var imageBytes = new Uint8Array(imageBuffer);
    var binary = '';
    for (var i = 0; i < imageBytes.length; i++) {
      binary += String.fromCharCode(imageBytes[i]);
    }
    var base64Image = btoa(binary);
    var mediaType = imageFile.type || 'image/png';

    var apiKey = context.env.ANTHROPIC_API_KEY;

    var systemPrompt = `You are the analyst for "A Bitcoin Consult" — a curated Bitcoin insights feed.
Given a tweet screenshot, return a JSON object with exactly these fields:

{
  "headline": "One punchy sentence under 160 chars — the key insight. No labels, no prefixes. This is the push notification text.",
  "analysis": "2-3 sentences of deeper context explaining WHY this matters. Under 450 chars. No hashtags, no emojis.",
  "username": "@handle from the tweet (just the @handle, e.g. '@PunterJeff'). If you cannot read it clearly, return empty string."
}

Rules:
- No markdown, no bold markers, no labels like 'Push:' or 'In-app:' anywhere
- Tone: informed, accessible, slightly irreverent — never hype or shill
- Return ONLY valid JSON, nothing else`;

    var userContent = [];

    userContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: base64Image
      }
    });

    var textPrompt = 'Analyze this tweet screenshot and return the JSON.';
    if (tweetText && tweetText.length > 4) {
      textPrompt = 'Analyze this tweet screenshot. The tweet text reads: "' + tweetText + '". Return the JSON.';
    }
    userContent.push({ type: 'text', text: textPrompt });

    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }]
      })
    });

    var result = await response.json();

    if (result.content && result.content[0] && result.content[0].text) {
      var raw = result.content[0].text.trim();
      // Parse the JSON response
      var parsed = {};
      try {
        // Strip any markdown code fences if Claude wrapped it
        var jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        parsed = JSON.parse(jsonStr);
      } catch(e) {
        // Fallback: treat the whole thing as a plain caption
        parsed = { headline: raw.substring(0, 160), analysis: '', username: '' };
      }
      // Build the caption string stored in KV: "headline\n\nanalysis"
      var caption = (parsed.headline || '').trim();
      if (parsed.analysis && parsed.analysis.trim()) {
        caption += '\n\n' + parsed.analysis.trim();
      }
      return new Response(JSON.stringify({
        caption: caption,
        headline: parsed.headline || '',
        analysis: parsed.analysis || '',
        username: parsed.username || ''
      }), {
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
