import { extractYoutubeId, extractYoutubeHandle } from './urlParser';
import { POPULAR_MULTISTREAMERS } from './presets';

export interface ResolvedYoutubeStream {
  videoId: string | null;
  channelId: string | null;
  handle: string | null;
  title?: string | null;
  isLive?: boolean;
}

/**
 * Resolves a live stream video ID or channel ID from video URL, video ID, channel URL, or @handle
 */
export async function resolveYoutubeLiveStream(input: string): Promise<ResolvedYoutubeStream> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { videoId: null, channelId: null, handle: null };
  }

  // 1. Direct Video ID or Watch URL
  const directVideoId = extractYoutubeId(trimmed);
  if (directVideoId) {
    return { videoId: directVideoId, channelId: null, handle: null, isLive: true };
  }

  // 2. Extract Handle or Channel Name
  const handle = extractYoutubeHandle(trimmed) || trimmed.replace(/^https?:\/\/(?:www\.)?youtube\.com\//, '').replace(/^@/, '').split('/')[0].split('?')[0];

  // Check preset list for known channelId
  const preset = POPULAR_MULTISTREAMERS.find(
    (p) =>
      (p.youtubeHandle && p.youtubeHandle.toLowerCase() === handle.toLowerCase()) ||
      (p.youtubeChannelName && p.youtubeChannelName.toLowerCase() === handle.toLowerCase()) ||
      p.twitchChannel.toLowerCase() === handle.toLowerCase()
  );

  const channelId = preset?.youtubeChannelId || (trimmed.startsWith('UC') && trimmed.length === 24 ? trimmed : null);

  // 3. Try to resolve active video ID from RSS feed or proxy with timeout
  if (channelId) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;

      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        const videoIdMatch = text.match(/<yt:videoId>([a-zA-Z0-9_-]{11})<\/yt:videoId>/);
        const titleMatch = text.match(/<media:title>([^<]+)<\/media:title>/) || text.match(/<title>([^<]+)<\/title>/);

        if (videoIdMatch && videoIdMatch[1]) {
          return {
            videoId: videoIdMatch[1],
            channelId,
            handle: preset?.youtubeHandle || handle,
            title: titleMatch ? titleMatch[1] : null,
            isLive: true,
          };
        }
      }
    } catch {
      // Ignore network/timeout errors and fallback
    }
  }

  // 4. Try live endpoint proxy
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const liveTargetUrl = `https://www.youtube.com/@${handle}/live`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(liveTargetUrl)}`;

    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const text = await res.text();
      const match = text.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
      const channelIdMatch = text.match(/channel_id=([a-zA-Z0-9_-]{24})/);

      if (match && match[1]) {
        return {
          videoId: match[1],
          channelId: channelIdMatch ? channelIdMatch[1] : channelId,
          handle,
          isLive: true,
        };
      }
    }
  } catch {
    // Ignore timeout
  }

  return {
    videoId: null,
    channelId,
    handle,
    isLive: false,
  };
}
