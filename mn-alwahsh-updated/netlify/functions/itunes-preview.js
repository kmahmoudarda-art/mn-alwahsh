// Looks up Apple's official ~30s preview URL for an iTunes track id, server-side,
// so the "Guess the song" player doesn't depend on the player's own network,
// region or ad blocker reaching itunes.apple.com. Returns { previewUrl } or
// { previewUrl: null }. Tries the default store first, then a few Arab storefronts.
const COUNTRIES = [null, 'AE', 'EG', 'SA'];

export default async (req) => {
  const id = new URL(req.url).searchParams.get('id') || '';
  if (!/^\d{3,12}$/.test(id)) {
    return new Response(JSON.stringify({ previewUrl: null, error: 'bad-id' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  for (const cc of COUNTRIES) {
    try {
      const r = await fetch(`https://itunes.apple.com/lookup?id=${id}${cc ? `&country=${cc}` : ''}`);
      if (!r.ok) continue;
      const url = (await r.json())?.results?.[0]?.previewUrl;
      if (url) {
        return new Response(JSON.stringify({ previewUrl: url }), {
          headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=86400' },
        });
      }
    } catch { /* try next storefront */ }
  }
  return new Response(JSON.stringify({ previewUrl: null }), { headers: { 'content-type': 'application/json' } });
};
