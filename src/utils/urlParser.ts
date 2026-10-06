/**
 * URL and ID parsing utilities for YouTube and Twitch stream viewer
 */

/**
 * Extracts YouTube Video ID (11 characters) from various URL formats or raw ID
 */
export const extractYoutubeId = (input: string): string | null => {
  if (!input || !input.trim()) return null;
  const trimmed = input.trim();

  // If it's already a raw 11-char video ID (alphanumeric, hyphens, underscores)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle URL decoded or special encoded characters
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    // ignore
  }

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (match && match[1]) return match[1];
  }

  return null;
};

/**
 * Extracts YouTube Channel Handle (e.g., @zeeddota2, @tarik, @ludwig)
 */
export const extractYoutubeHandle = (input: string): string | null => {
  if (!input || !input.trim()) return null;
  const trimmed = input.trim();

  if (trimmed.startsWith('@')) {
    return trimmed.substring(1).split('/')[0].split('?')[0];
  }

  const match = trimmed.match(/(?:youtube\.com\/@|youtube\.com\/c\/|youtube\.com\/channel\/)([a-zA-Z0-9_.-]+)/i);
  if (match && match[1]) {
    return match[1].replace(/^@/, '');
  }

  return null;
};

/**
 * Extracts Twitch Channel name from URL or raw username
 */
export const extractTwitchChannel = (input: string): string | null => {
  if (!input || !input.trim()) return null;
  let trimmed = input.trim();

  // Strip leading @ if present
  if (trimmed.startsWith('@')) {
    trimmed = trimmed.substring(1);
  }

  // If already a valid channel name (alphanumeric and underscore, 3-25 chars)
  if (/^[a-zA-Z0-9_]{3,25}$/.test(trimmed) && !trimmed.includes('http') && !trimmed.includes('.com') && !trimmed.includes('.tv')) {
    return trimmed.toLowerCase();
  }

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    // ignore
  }

  const match = decoded.match(/(?:twitch\.tv\/|twitch\.com\/)([a-zA-Z0-9_]+)/i);
  if (match && match[1]) {
    const channel = match[1].toLowerCase();
    // Exclude reserved routes like 'directory', 'videos', 'p', 'downloads'
    if (!['directory', 'videos', 'p', 'downloads', 'popout', 'embed'].includes(channel)) {
      return channel;
    }
  }

  return null;
};

export interface ParsedStreamParams {
  youtubeId: string | null;
  twitchChannel: string | null;
  singleStreamer?: string | null;
  youtubeHandle?: string | null;
  rawYoutubeUrl?: string;
  rawTwitchUrl?: string;
}

/**
 * Smart detection for two parameters in either order (yt/tw or tw/yt)
 */
export const smartDetectStreamPair = (param1: string, param2?: string): ParsedStreamParams => {
  const p1 = (param1 || '').trim();
  const p2 = (param2 || '').trim();

  let youtubeId: string | null = null;
  let twitchChannel: string | null = null;
  let youtubeHandle: string | null = null;

  if (p1 && p2) {
    const yt1 = extractYoutubeId(p1);
    const tw1 = extractTwitchChannel(p1);
    const yt2 = extractYoutubeId(p2);
    const tw2 = extractTwitchChannel(p2);
    const handle1 = extractYoutubeHandle(p1);
    const handle2 = extractYoutubeHandle(p2);

    if (yt1 && tw2) {
      youtubeId = yt1;
      twitchChannel = tw2;
    } else if (yt2 && tw1) {
      youtubeId = yt2;
      twitchChannel = tw1;
    } else if (handle1 && tw2) {
      youtubeHandle = handle1;
      twitchChannel = tw2;
    } else if (handle2 && tw1) {
      youtubeHandle = handle2;
      twitchChannel = tw1;
    } else if (yt1) {
      youtubeId = yt1;
      twitchChannel = extractTwitchChannel(p2) || p2.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    } else if (tw1) {
      twitchChannel = tw1;
      youtubeId = yt2 || (p2.length === 11 ? p2 : null);
      youtubeHandle = handle2;
    } else {
      youtubeId = extractYoutubeId(p1) || (p1.length === 11 ? p1 : null);
      twitchChannel = extractTwitchChannel(p2) || p2.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
      youtubeHandle = extractYoutubeHandle(p1);
    }
  } else if (p1) {
    const yt = extractYoutubeId(p1);
    const tw = extractTwitchChannel(p1);
    const handle = extractYoutubeHandle(p1);

    if (yt) {
      youtubeId = yt;
    } else if (handle) {
      youtubeHandle = handle;
      twitchChannel = handle.toLowerCase();
    } else if (tw) {
      twitchChannel = tw;
    } else {
      twitchChannel = p1.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
      return {
        youtubeId: null,
        twitchChannel,
        singleStreamer: twitchChannel,
      };
    }
  }

  return { youtubeId, twitchChannel, youtubeHandle };
};

/**
 * Parses the current window location (pathname, search query params, hash)
 */
export const parseStreamParamsFromUrl = (): ParsedStreamParams => {
  if (typeof window === 'undefined') {
    return { youtubeId: null, twitchChannel: null };
  }

  // 1. Check Query Parameters
  const searchParams = new URLSearchParams(window.location.search);
  const queryYt = searchParams.get('yt') || searchParams.get('v') || searchParams.get('youtube') || searchParams.get('video');
  const queryTw = searchParams.get('tw') || searchParams.get('c') || searchParams.get('twitch') || searchParams.get('channel') || searchParams.get('chat');
  const queryStreamer = searchParams.get('streamer') || searchParams.get('s');

  if (queryYt || queryTw) {
    const parsed = smartDetectStreamPair(queryYt || '', queryTw || '');
    if (parsed.youtubeId || parsed.twitchChannel || parsed.youtubeHandle) {
      return parsed;
    }
  }

  if (queryStreamer) {
    const channel = extractTwitchChannel(queryStreamer) || queryStreamer;
    return {
      youtubeId: null,
      twitchChannel: channel,
      singleStreamer: channel,
    };
  }

  // 2. Check Hash
  if (window.location.hash) {
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (hash.includes('?')) {
      const hashParams = new URLSearchParams(hash.substring(hash.indexOf('?')));
      const hYt = hashParams.get('yt') || hashParams.get('v') || hashParams.get('youtube');
      const hTw = hashParams.get('tw') || hashParams.get('c') || hashParams.get('twitch');
      if (hYt || hTw) {
        return smartDetectStreamPair(hYt || '', hTw || '');
      }
    }

    const hashSegments = hash.split('/').filter(Boolean);
    if (hashSegments.length >= 2) {
      return smartDetectStreamPair(hashSegments[0], hashSegments[1]);
    } else if (hashSegments.length === 1 && hashSegments[0] !== '') {
      return smartDetectStreamPair(hashSegments[0]);
    }
  }

  // 3. Check Pathname
  const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '');
  if (pathname) {
    if (pathname.includes('http')) {
      const parts = pathname.split(/(?=https?:\/\/)/);
      if (parts.length >= 2) {
        return smartDetectStreamPair(parts[0].replace(/\/+$/, ''), parts[1]);
      }
    }

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length >= 2) {
      return smartDetectStreamPair(segments[0], segments[1]);
    } else if (segments.length === 1) {
      return smartDetectStreamPair(segments[0]);
    }
  }

  return { youtubeId: null, twitchChannel: null };
};

/**
 * Updates the browser address bar
 */
export const updateBrowserUrl = (youtubeId: string | null, twitchChannel: string | null) => {
  if (typeof window === 'undefined') return;

  if (youtubeId && twitchChannel) {
    const newPath = `/${encodeURIComponent(youtubeId)}/${encodeURIComponent(twitchChannel)}`;
    if (window.location.pathname !== newPath) {
      window.history.replaceState({ youtubeId, twitchChannel }, '', newPath);
    }
  } else if (twitchChannel && !youtubeId) {
    const newPath = `/${encodeURIComponent(twitchChannel)}`;
    if (window.location.pathname !== newPath) {
      window.history.replaceState({ twitchChannel }, '', newPath);
    }
  }
};

/**
 * Builds full shareable link for a stream pair
 */
export const buildShareableUrl = (youtubeId: string, twitchChannel: string): string => {
  if (typeof window === 'undefined') return `/${youtubeId}/${twitchChannel}`;
  return `${window.location.origin}/${youtubeId}/${twitchChannel}`;
};

/**
 * Generates YouTube Live search URL with LIVE filter (sp=EgJAAQ%253D%253D)
 */
export const generateYoutubeLiveSearchUrl = (query: string): string => {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgJAAQ%253D%253D`;
};

/**
 * Generates direct YouTube channel live URL (e.g. https://www.youtube.com/@zeeddota2/live)
 */
export const generateYoutubeChannelLiveUrl = (handleOrName: string): string => {
  const clean = handleOrName.startsWith('@') ? handleOrName : `@${handleOrName}`;
  return `https://www.youtube.com/${clean}/live`;
};
