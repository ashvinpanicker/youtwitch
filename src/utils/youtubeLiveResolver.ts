import { extractYoutubeId, extractYoutubeHandle, extractYoutubeChannelId } from './urlParser';
import { parseYoutubeLivePage, YoutubeLiveLookup, YOUTUBE_CHANNEL_TARGET } from './parseYoutubeLivePage';

export interface ResolvedYoutubeStream {
  videoId: string | null;
  isLive: boolean;
  title?: string | null;
}

const fetchWithTimeout = (url: string, ms: number) => fetch(url, { signal: AbortSignal.timeout(ms) });

/**
 * Turns a video link/ID, channel ID, channel URL or @handle into a YouTube channel path
 */
export const toYoutubeChannelTarget = (input: string): string | null => {
  const trimmed = input.trim();
  if (YOUTUBE_CHANNEL_TARGET.test(trimmed)) return trimmed;
  const channelId = extractYoutubeChannelId(trimmed);
  if (channelId) return `channel/${channelId}`;
  const handle =
    extractYoutubeHandle(trimmed) ||
    trimmed.replace(/^https?:\/\/(?:www\.)?youtube\.com\//, '').replace(/^@/, '').split(/[/?]/)[0];
  const target = `@${handle}`;
  return YOUTUBE_CHANNEL_TARGET.test(target) ? target : null;
};

/**
 * Finds the current live video for a channel. YouTube issues a new video ID for every
 * stream, so it has to be looked up each time rather than stored.
 */
export async function resolveYoutubeLiveStream(input: string): Promise<ResolvedYoutubeStream> {
  const directVideoId = extractYoutubeId(input);
  if (directVideoId) return { videoId: directVideoId, isLive: true };

  const target = toYoutubeChannelTarget(input);
  if (!target) return { videoId: null, isLive: false };

  // 1. Our own /api/live function
  try {
    const res = await fetchWithTimeout(`/api/live?channel=${encodeURIComponent(target)}`, 9000);
    if (res.ok) return toResult(await res.json());
  } catch {
    // fall through to the public proxy
  }

  // 2. Public CORS proxy (when the app is hosted without the API function)
  try {
    const liveUrl = `https://www.youtube.com/${target}/live`;
    const res = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(liveUrl)}`, 6000);
    if (res.ok) return toResult(parseYoutubeLivePage(await res.text()));
  } catch {
    // ignore network/timeout errors
  }

  return { videoId: null, isLive: false };
}

const toResult = (lookup: YoutubeLiveLookup): ResolvedYoutubeStream =>
  lookup.isLive && lookup.videoId ? { videoId: lookup.videoId, isLive: true, title: lookup.title } : { videoId: null, isLive: false };
