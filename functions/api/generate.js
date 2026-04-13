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

    // Verify admin password
    if (!password || password !== context.env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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

    var systemPrompt = `You are the voice of "A Bitcoin Consult" — a curated Bitcoin insights feed.
Your job is to write a short, punchy caption (2-3 sentences max) that adds context to a Bitcoin/crypto tweet.
Your tone is: informed but accessible, slightly irreverent, no hype or shilling.
You explain WHY this tweet matters, not just what it says.
Never use hashtags or emojis. Keep it under 200 characters for the push notification preview,
but include a slightly longer version (under 500 chars) for the in-app display.
Return ONLY the caption text, nothing else.`;

    var userContent = [];

    // Always include the image
    userContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: base64Image
      }
    });

    // Add text prompt
    var textPrompt = 'Write a caption for this tweet screenshot.';
    if (tweetText && tweetText.length > 4) {
      textPrompt = 'Write a caption for this tweet screenshot. The tweet text reads: ' + tweetText;
    }
    userContent.push({
      type: 'text',
      text: textPrompt
    });

    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: userContent
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
