// =============================================================
// GET /api/image?key=posts/filename.jpeg — Serve images from R2
// =============================================================
// This replaces the catch-all [[path]].js route which is hard
// to create on GitHub. Simple query-param approach instead.
//
// Bindings needed:
//   - ABC_IMAGES (R2 bucket)
// =============================================================

export async function onRequestGet(context) {
  try {
    var url = new URL(context.request.url);
    var key = url.searchParams.get('key');

    if (!key) {
      return new Response('Missing key parameter', { status: 400 });
    }

    var object = await context.env.ABC_IMAGES.get(key);

    if (!object) {
      return new Response('Image not found: ' + key, { status: 404 });
    }

    var headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=86400');

    return new Response(object.body, { headers: headers });

  } catch (err) {
    return new Response('Error: ' + err.message, { status: 500 });
  }
}
