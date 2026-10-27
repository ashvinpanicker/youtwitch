import React from 'react';
import { m } from 'motion/react';
import { Search } from 'lucide-react';
import { PresetStreamer } from '../types/stream';
import { DOTA_STREAMERS, VARIETY_STREAMERS } from '../utils/presets';
import { StreamerTile } from './StreamerTile';
import { LiveEntry, LiveStreamCard } from './LiveStreamCard';
import { LiveStatusMap } from '../hooks/useLiveStatus';

interface WelcomeScreenProps {
  liveStatus: LiveStatusMap;
  /** Streamers live right now, most watched first */
  liveEntries: LiveEntry[];
  favoriteStreamers: PresetStreamer[];
  favorites: string[];
  onSelect: (streamer: PresetStreamer) => void;
  onToggleFavorite: (channel: string) => void;
  onOpenSearch: () => void;
  children?: React.ReactNode;
}

const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.03 } } };

const Section: React.FC<{
  id: string;
  title: string;
  hint?: string;
  streamers: PresetStreamer[];
  favorites: string[];
  liveStatus: LiveStatusMap;
  onSelect: (streamer: PresetStreamer) => void;
  onToggleFavorite: (channel: string) => void;
}> = ({ id, title, hint, streamers, favorites, liveStatus, onSelect, onToggleFavorite }) => {
  if (streamers.length === 0) return null;
  return (
    <section aria-labelledby={id}>
      <div className="flex items-baseline justify-between mb-2.5 px-1">
        <h2 id={id} className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {title}
        </h2>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      <m.ul variants={listVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {streamers.map((s) => (
          <StreamerTile
            key={s.twitchChannel}
            streamer={s}
            isFavorite={favorites.includes(s.twitchChannel.toLowerCase())}
            live={liveStatus.byChannel[s.twitchChannel.toLowerCase()]}
            onSelect={onSelect}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </m.ul>
    </section>
  );
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  liveStatus,
  liveEntries,
  favoriteStreamers,
  favorites,
  onSelect,
  onToggleFavorite,
  onOpenSearch,
  children,
}) => {
  const isLive = (s: PresetStreamer) => !!liveStatus.byChannel[s.twitchChannel.toLowerCase()]?.isLive;
  // Live streamers already have a card in "Live now"
  const notFavorite = (s: PresetStreamer) => !favorites.includes(s.twitchChannel.toLowerCase()) && !isLive(s);
  const shared = { favorites, liveStatus, onSelect, onToggleFavorite };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-14 space-y-10">
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="text-center space-y-5"
      >
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">YouTube streams, Twitch chat.</h1>
          <p className="text-sm sm:text-base text-gray-400">Pick a streamer to watch their YouTube live with Twitch chat side by side.</p>
        </div>
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full max-w-md mx-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] text-left text-sm text-gray-400 transition-colors"
        >
          <Search className="w-4 h-4" aria-hidden="true" />
          <span className="flex-1">Search streamers…</span>
          <kbd className="kbd hidden sm:inline-block">⌘K</kbd>
        </button>
      </m.div>

      {liveEntries.length > 0 && (
        <section aria-labelledby="welcome-live">
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
            <h2 id="welcome-live" className="text-xs font-semibold uppercase tracking-wider text-gray-300">
              Live now
            </h2>
          </div>
          <m.ul
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6"
          >
            {liveEntries.slice(0, 6).map((entry) => (
              <LiveStreamCard key={entry.streamer.twitchChannel} {...entry} thumbnailKey={liveStatus.fetchedAt} onSelect={onSelect} />
            ))}
          </m.ul>
        </section>
      )}

      <Section id="welcome-favorites" title="Favourites" hint="Star a streamer to pin it here" streamers={favoriteStreamers} {...shared} />
      <Section id="welcome-dota" title="More Dota 2" streamers={DOTA_STREAMERS.filter(notFavorite)} {...shared} />
      <Section id="welcome-more" title="Other multistreamers" streamers={VARIETY_STREAMERS.filter(notFavorite).slice(0, 6)} {...shared} />

      {children && (
        <section aria-labelledby="welcome-custom" className="pt-2">
          <h2 id="welcome-custom" className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-1">
            Or paste links
          </h2>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">{children}</div>
        </section>
      )}
    </div>
  );
};
