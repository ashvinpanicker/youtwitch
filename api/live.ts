import { parseYoutubeLivePage, YoutubeLiveLookup, YOUTUBE_CHANNEL_TARGET } from '../src/utils/parseYoutubeLivePage';

const MAX_BATCH = 24;

const lookupChannel = async (target: string): Promise<YoutubeLiveLookup> => {
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
    if (!res.ok) return { videoId: null, isLive: false };
    return parseYoutubeLivePage(await res.text());
  } catch {
    return { videoId: null, isLive: false };
  }
};

const cacheHeaders = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' };

/**
 * GET /api/live?channel=@zeeddota2 (or channel=channel/UC…) → one channel's live status
 * GET /api/live?channels=@a,channel/UC…                     → { [channel]: status }
 *
 * YouTube changes the live video ID for every stream and pages can't read youtube.com
 * cross-origin, so we look it up here, along with the title, viewers and avatar.
 */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;

  const batch = params.get('channels');
  if (batch !== null) {
    const targets = [...new Set(batch.split(','))].filter((t) => YOUTUBE_CHANNEL_TARGET.test(t)).slice(0, MAX_BATCH);
    const results = await Promise.all(targets.map(lookupChannel));
    return Response.json(Object.fromEntries(targets.map((t, i) => [t, results[i]])), { headers: cacheHeaders });
  }

  const target = params.get('channel') || '';
  if (!YOUTUBE_CHANNEL_TARGET.test(target)) {
    return Response.json({ error: 'Invalid channel' }, { status: 400 });
  }
  return Response.json(await lookupChannel(target), { headers: cacheHeaders });
}
