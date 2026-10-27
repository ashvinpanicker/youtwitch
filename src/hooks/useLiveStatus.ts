import { useEffect, useMemo, useState } from 'react';
import { PresetStreamer } from '../types/stream';
import { YoutubeLiveLookup } from '../utils/parseYoutubeLivePage';
import { streamerYoutubeTarget } from '../utils/youtubeLiveResolver';

const REFRESH_MS = 3 * 60_000;

export interface LiveStatusMap {
  /** Status keyed by Twitch channel (lowercase) */
  byChannel: Record<string, YoutubeLiveLookup>;
  /** When the statuses were fetched; used to refresh live thumbnails */
  fetchedAt: number;
}

/**
 * Fetches YouTube live status (title, viewers, avatar) for many streamers in one
 * request, refreshing every few minutes while the tab is visible.
 */
export const useLiveStatus = (streamers: PresetStreamer[]): LiveStatusMap => {
  const [status, setStatus] = useState<LiveStatusMap>({ byChannel: {}, fetchedAt: 0 });

  // channel → YouTube target, stable across renders while the list doesn't change
  const targets = useMemo(() => {
    const entries = streamers
      .map((s) => [s.twitchChannel.toLowerCase(), streamerYoutubeTarget(s)] as const)
      .filter((entry): entry is readonly [string, string] => !!entry[1]);
    return Object.fromEntries(entries);
  }, [streamers]);
  const key = JSON.stringify(targets);

  useEffect(() => {
    const channelTargets: Record<string, string> = JSON.parse(key);
    const list = [...new Set(Object.values(channelTargets))];
    if (list.length === 0) return;

    let cancelled = false;
    const load = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(`/api/live?channels=${list.map(encodeURIComponent).join(',')}`);
        if (!res.ok) return;
        const byTarget: Record<string, YoutubeLiveLookup> = await res.json();
        if (cancelled) return;
        const byChannel = Object.fromEntries(
          Object.entries(channelTargets)
            .filter(([, target]) => byTarget[target])
            .map(([channel, target]) => [channel, byTarget[target]])
        );
        setStatus({ byChannel, fetchedAt: Date.now() });
      } catch {
        // live status is a nice-to-have; keep whatever we had
      }
    };

    load();
    const timer = setInterval(load, REFRESH_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [key]);

  return status;
};

export const formatViewers = (viewers?: number | null) => {
  if (viewers == null) return null;
  if (viewers >= 1_000_000) return `${(viewers / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (viewers >= 1_000) return `${(viewers / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(viewers);
};

export const formatUptime = (startedAt?: string | null, now = Date.now()) => {
  if (!startedAt) return null;
  const secs = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  if (!Number.isFinite(secs)) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
