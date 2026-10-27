import React, { useState } from 'react';
import { m } from 'motion/react';
import { PresetStreamer } from '../types/stream';
import { YoutubeLiveLookup, youtubeLiveThumbnail } from '../utils/parseYoutubeLivePage';
import { streamCategory } from '../utils/presets';
import { formatViewers } from '../hooks/useLiveStatus';
import { StreamerAvatar } from './StreamerTile';

export interface LiveEntry {
  streamer: PresetStreamer;
  live: YoutubeLiveLookup;
}

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
} as const;

interface LiveStreamCardProps extends LiveEntry {
  /** Bumps the live thumbnail when statuses refresh */
  thumbnailKey?: number;
  onSelect: (streamer: PresetStreamer) => void;
}

/**
 * Twitch directory–style card: live thumbnail, LIVE + viewer badges, then avatar, title and category.
 */
export const LiveStreamCard: React.FC<LiveStreamCardProps> = ({ streamer, live, thumbnailKey, onSelect }) => {
  const [thumbFailed, setThumbFailed] = useState(false);
  const category = streamCategory(streamer, live);
  const viewers = formatViewers(live.viewers);

  return (
    <m.li variants={cardVariants} className="min-w-0">
      <button
        type="button"
        data-streamer-option
        onClick={() => onSelect(streamer)}
        className="group block w-full text-left rounded-lg"
      >
        {/* Purple offset frame, like Twitch's hover effect */}
        <span className="block rounded-lg bg-purple-500">
          <span className="relative block aspect-video rounded-lg overflow-hidden bg-[#26262c] transition-transform duration-150 ease-out group-hover:translate-x-1.5 group-hover:-translate-y-1.5 group-focus-visible:translate-x-1.5 group-focus-visible:-translate-y-1.5 motion-reduce:transition-none">
            {live.videoId && !thumbFailed ? (
              <img
                src={youtubeLiveThumbnail(live.videoId, thumbnailKey)}
                alt=""
                width={320}
                height={180}
                loading="lazy"
                decoding="async"
                onError={() => setThumbFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="flex w-full h-full items-center justify-center">
                <StreamerAvatar streamer={streamer} size="xl" avatarUrl={live.avatarUrl} />
              </span>
            )}
            <span className="absolute top-2 left-2 px-1.5 py-px rounded bg-red-600 text-white text-[11px] font-semibold uppercase tracking-wide">
              Live
            </span>
            {viewers && (
              <span className="absolute bottom-2 left-2 px-1.5 py-px rounded bg-black/75 text-white text-xs">
                {viewers} viewers
              </span>
            )}
          </span>
        </span>

        <span className="flex gap-2.5 mt-2.5">
          <StreamerAvatar streamer={streamer} avatarUrl={live.avatarUrl} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
              {live.title || `${streamer.name} is live`}
            </span>
            <span className="block text-xs text-gray-400 truncate">{streamer.name}</span>
            {category && (
              <span className="inline-block mt-1 px-2 py-px rounded-full bg-white/10 text-[11px] text-gray-300">{category}</span>
            )}
          </span>
        </span>
        <span className="sr-only">, live now, watch with Twitch chat</span>
      </button>
    </m.li>
  );
};
