// =============================================================
// GET /images/* — Serve tweet screenshots stored in R2
// =============================================================
// Example: /images/posts/1713900000000.png
//
// Bindings needed:
//   - ABC_IMAGES (R2 bucket)
// =============================================================

export async function onRequestGet(context) {
  try {
    // context.params.path is an array of path segments
    var pathParts = context.params.path;
    var key = Array.isArray(pathParts) ? pathParts.join('/') : String(pathParts);

    var object = await context.env.ABC_IMAGES.get(key);

    if (!object) {
      return new Response('Image not found', { status: 404 });
    }

    var headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=86400');

    return new Response(object.body, { headers: headers });

  } catch (err) {
    return new Response('Error: ' + err.message, { status: 500 });
  }
}
