// =============================================================
// GET /api/posts — Returns all published posts from KV
// =============================================================
// Returns JSON: { posts: [ { id, caption, image, timestamp, sent, failed } ] }
// Posts are sorted newest first.
//
// Bindings needed:
//   - ABC_TOKENS (KV namespace — posts are stored with "post_" prefix)
// =============================================================

export async function onRequestGet(context) {
  try {
    var kv = context.env.ABC_TOKENS;
    var list = await kv.list({ prefix: 'post_' });
    var posts = [];

    for (var i = 0; i < list.keys.length; i++) {
      var key = list.keys[i].name;
      var val = await kv.get(key);
      if (val) {
        try {
          var post = JSON.parse(val);
          post.id = key;
          posts.push(post);
        } catch (e) {
          // skip malformed entries
        }
      }
    }

    // Sort newest first
    posts.sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return new Response(JSON.stringify({ posts: posts }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
