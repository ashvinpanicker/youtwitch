export interface YoutubeLiveLookup {
  videoId: string | null;
  isLive: boolean;
  title?: string | null;
}

/**
 * Reads the HTML of https://www.youtube.com/<channel>/live.
 * While a channel is live that page canonicalises to the live video's watch URL and
 * reports `"isLiveNow":true`; when offline it canonicalises to the channel page, and
 * any other videoId on the page is just an old upload.
 */
export const parseYoutubeLivePage = (html: string): YoutubeLiveLookup => {
  const canonical = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})"/);
  if (!canonical) return { videoId: null, isLive: false };

  const title = html.match(/<meta name="title" content="([^"]*)"/)?.[1] ?? null;
  return { videoId: canonical[1], isLive: html.includes('"isLiveNow":true'), title };
};

/** `@handle` or `channel/UC…`, the only path shapes we ever request from YouTube */
export const YOUTUBE_CHANNEL_TARGET = /^(@[a-zA-Z0-9_.-]{1,100}|channel\/UC[a-zA-Z0-9_-]{22})$/;
