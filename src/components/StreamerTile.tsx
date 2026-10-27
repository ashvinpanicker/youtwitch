import React from 'react';
import { m } from 'motion/react';
import { ExternalLink, Star } from 'lucide-react';
import { PresetStreamer } from '../types/stream';
import { generateYoutubeChannelLiveUrl } from '../utils/urlParser';

export const StreamerAvatar: React.FC<{ streamer: PresetStreamer; size?: 'sm' | 'md' }> = ({ streamer, size = 'md' }) => (
  <span
    aria-hidden="true"
    className={`${size === 'sm' ? 'w-6 h-6 text-[9px] rounded-md' : 'w-9 h-9 text-[11px] rounded-lg'} bg-gradient-to-tr ${
      streamer.color || 'from-purple-600 to-red-600'
    } flex items-center justify-center font-bold text-white shrink-0`}
  >
    {streamer.avatarText || streamer.name.substring(0, 2).toUpperCase()}
  </span>
);

const tileVariants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
} as const;

interface StreamerTileProps {
  streamer: PresetStreamer;
  isFavorite: boolean;
  isActive?: boolean;
  onSelect: (streamer: PresetStreamer) => void;
  onToggleFavorite: (channel: string) => void;
}

export const StreamerTile: React.FC<StreamerTileProps> = ({ streamer, isFavorite, isActive, onSelect, onToggleFavorite }) => {
  const handle = streamer.youtubeHandle || streamer.youtubeChannelName;

  return (
    <m.li variants={tileVariants} className="relative group">
      <button
        type="button"
        data-streamer-option
        onClick={() => onSelect(streamer)}
        aria-current={isActive ? 'true' : undefined}
        className={`w-full h-full flex items-center gap-3 p-3 pr-16 rounded-xl border text-left transition-colors ${
          isActive
            ? 'bg-purple-500/10 border-purple-500/60'
            : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/15'
        }`}
      >
        <StreamerAvatar streamer={streamer} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <span className="truncate">{streamer.name}</span>
            {streamer.isEvent && (
              <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide px-1.5 py-px rounded bg-white/10 text-gray-300">
                Event
              </span>
            )}
          </span>
          <span className="block text-xs text-gray-400 truncate">{streamer.description || `@${streamer.twitchChannel}`}</span>
        </span>
        <span className="sr-only">, watch YouTube stream with Twitch chat</span>
      </button>

      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
        <a
          href={generateYoutubeChannelLiveUrl(handle)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${streamer.name} live page on YouTube (new tab)`}
          title="Open on YouTube"
          className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-opacity [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
        <button
          type="button"
          onClick={() => onToggleFavorite(streamer.twitchChannel)}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `Remove ${streamer.name} from favourites` : `Add ${streamer.name} to favourites`}
          title={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
          className={`p-1.5 rounded-md transition-colors ${
            isFavorite ? 'text-amber-400 hover:bg-amber-400/10' : 'text-gray-400 hover:text-amber-300 hover:bg-white/10'
          }`}
        >
          <m.span
            initial={false}
            animate={{ scale: isFavorite ? [1, 1.3, 1] : 1 }}
            transition={{ duration: 0.25 }}
            className="block"
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
          </m.span>
        </button>
      </div>
    </m.li>
  );
};
