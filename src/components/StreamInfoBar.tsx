import React, { useEffect, useState } from 'react';
import { m } from 'motion/react';
import { Heart, User } from 'lucide-react';
import { PresetStreamer } from '../types/stream';
import { YoutubeLiveLookup } from '../utils/parseYoutubeLivePage';
import { streamCategory } from '../utils/presets';
import { formatUptime } from '../hooks/useLiveStatus';
import { StreamerAvatar } from './StreamerTile';

/** Ticks on its own so the rest of the page doesn't re-render every second */
const Uptime: React.FC<{ startedAt: string }> = ({ startedAt }) => {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const uptime = formatUptime(startedAt, now);
  return uptime ? (
    <span className="tabular-nums text-gray-400" title="Stream uptime">
      {uptime}
    </span>
  ) : null;
};

interface StreamInfoBarProps {
  streamer: PresetStreamer;
  /** Live details for the video being played, if we know them */
  live: YoutubeLiveLookup | null;
  avatarUrl?: string | null;
  isFavorite: boolean;
  onToggleFavorite: (channel: string) => void;
}

/**
 * Twitch-style strip under the player: avatar with live ring, name, stream title,
 * category, viewer count and uptime.
 */
export const StreamInfoBar: React.FC<StreamInfoBarProps> = ({ streamer, live, avatarUrl, isFavorite, onToggleFavorite }) => {
  const isLive = !!live?.isLive;
  const category = isLive ? streamCategory(streamer, live) : null;

  return (
    <section
      aria-label="Stream info"
      className="shrink-0 flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-background border-b md:border-b-0 border-white/[0.06]"
    >
      <span className="relative shrink-0">
        <StreamerAvatar streamer={streamer} size="lg" avatarUrl={avatarUrl} isLive={isLive} />
        {isLive && (
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1 rounded bg-red-600 text-[9px] font-bold uppercase tracking-wide text-white leading-[14px]">
            Live
          </span>
        )}
      </span>

      <div className="min-w-0 flex-1">
        <h1 className="text-sm sm:text-base font-semibold text-white truncate">{streamer.name}</h1>
        {live?.title && <p className="text-xs sm:text-sm text-gray-200 truncate">{live.title}</p>}
        {category && <p className="hidden sm:block text-xs text-purple-300 truncate">{category}</p>}
      </div>

      <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-xs sm:text-sm">
        {isLive && live?.viewers != null && (
          <span className="inline-flex items-center gap-1 font-semibold text-red-400">
            <User className="w-3.5 h-3.5" aria-hidden="true" />
            {live.viewers.toLocaleString()}
            <span className="sr-only"> viewers</span>
          </span>
        )}
        {isLive && live?.startedAt && (
          <span className="hidden sm:inline">
            <Uptime startedAt={live.startedAt} />
          </span>
        )}
        <button
          type="button"
          onClick={() => onToggleFavorite(streamer.twitchChannel)}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `Remove ${streamer.name} from favourites` : `Add ${streamer.name} to favourites`}
          className={`inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-md text-sm font-semibold transition-colors ${
            isFavorite ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white'
          }`}
        >
          <m.span initial={false} animate={{ scale: isFavorite ? [1, 1.3, 1] : 1 }} transition={{ duration: 0.25 }} className="block">
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current text-purple-400' : ''}`} aria-hidden="true" />
          </m.span>
          <span className="hidden sm:inline">{isFavorite ? 'Favourited' : 'Favourite'}</span>
        </button>
      </div>
    </section>
  );
};
