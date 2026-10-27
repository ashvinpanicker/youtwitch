import { parseYoutubeLivePage, YOUTUBE_CHANNEL_TARGET } from '../src/utils/parseYoutubeLivePage';

/**
 * GET /api/live?channel=@zeeddota2 (or channel=channel/UC…)
 * Finds the channel's current live video ID. YouTube changes the live video ID for
 * every stream and pages can't read youtube.com cross-origin, so we look it up here.
 */
export async function GET(request: Request): Promise<Response> {
  const target = new URL(request.url).searchParams.get('channel') || '';
  if (!YOUTUBE_CHANNEL_TARGET.test(target)) {
    return Response.json({ error: 'Invalid channel' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://www.youtube.com/${target}/live`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        // Skip the EU cookie consent interstitial
        Cookie: 'SOCS=CAI',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return Response.json({ videoId: null, isLive: false }, { status: res.status === 404 ? 404 : 502 });

    return Response.json(parseYoutubeLivePage(await res.text()), {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch {
    return Response.json({ videoId: null, isLive: false }, { status: 502 });
  }
}
