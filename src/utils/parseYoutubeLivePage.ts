export interface YoutubeLiveLookup {
  videoId: string | null;
  isLive: boolean;
  title?: string | null;
  /** Concurrent viewers while live */
  viewers?: number | null;
  /** ISO time the stream started */
  startedAt?: string | null;
  /** YouTube category, e.g. "Gaming" */
  category?: string | null;
  channelName?: string | null;
  avatarUrl?: string | null;
}

const decodeEntities = (text: string) =>
  text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const match = (html: string, pattern: RegExp) => html.match(pattern)?.[1] ?? null;

/** Only keep YouTube-hosted avatar images, resized to 88px */
const avatar = (url: string | null) =>
  url && /^https:\/\/yt\d\.(ggpht|googleusercontent)\.com\//.test(url) ? url.replace(/=s\d+-/, '=s88-') : null;

/**
 * Reads the HTML of https://www.youtube.com/<channel>/live.
 * While a channel is live that page canonicalises to the live video's watch URL and
 * reports `"isLiveNow":true`; when offline it canonicalises to the channel page, and
 * any other videoId on the page is just an old upload.
 */
export const parseYoutubeLivePage = (html: string): YoutubeLiveLookup => {
  const videoId = match(html, /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})"/);

  if (!videoId) {
    const name = match(html, /<meta property="og:title" content="([^"]*)"/);
    return {
      videoId: null,
      isLive: false,
      channelName: name ? decodeEntities(name) : null,
      avatarUrl: avatar(match(html, /<meta property="og:image" content="([^"]*)"/)),
    };
  }

  const title = match(html, /<meta name="title" content="([^"]*)"/);
  const viewers = match(html, /"originalViewCount":"(\d+)"/);
  return {
    videoId,
    // `isLiveNow` is sometimes missing; videoDetails' `isLive` is present while live (and for scheduled streams)
    isLive: (html.includes('"isLiveNow":true') || html.includes('"isLive":true')) && !html.includes('"isUpcoming":true'),
    title: title ? decodeEntities(title) : null,
    viewers: viewers ? Number(viewers) : null,
    startedAt: match(html, /"startTimestamp":"([^"]+)"/),
    category: match(html, /"category":"([^"]+)"/),
    channelName: match(html, /"ownerChannelName":"([^"]+)"/) ?? match(html, /"author":"([^"]+)"/),
    avatarUrl: avatar(match(html, /"channelThumbnail":\{"thumbnails":\[\{"url":"([^"]+)"/)),
  };
};

/** `@handle` or `channel/UC…`, the only path shapes we ever request from YouTube */
export const YOUTUBE_CHANNEL_TARGET = /^(@[a-zA-Z0-9_.-]{1,100}|channel\/UC[a-zA-Z0-9_-]{22})$/;

/** Live thumbnail that YouTube refreshes while the stream runs (16:9, 320×180) */
export const youtubeLiveThumbnail = (videoId: string, cacheKey?: number) =>
  `https://i.ytimg.com/vi/${videoId}/mqdefault_live.jpg${cacheKey ? `?t=${cacheKey}` : ''}`;
