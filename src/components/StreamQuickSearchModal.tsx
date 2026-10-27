import React, { useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { Search, ExternalLink, Play, Clock, X } from 'lucide-react';
import { DOTA_STREAMERS, VARIETY_STREAMERS, POPULAR_MULTISTREAMERS, findPresetByChannel } from '../utils/presets';
import { PresetStreamer, StreamHistoryItem } from '../types/stream';
import { generateYoutubeLiveSearchUrl, extractTwitchChannel } from '../utils/urlParser';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { StreamerTile } from './StreamerTile';

interface StreamQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStreamer: (streamer: PresetStreamer) => void;
  onSelectHistory: (item: StreamHistoryItem) => void;
  onDeleteHistory: (id: string) => void;
  history: StreamHistoryItem[];
  favorites: string[];
  onToggleFavorite: (channel: string) => void;
  currentTwitchChannel?: string | null;
}

const matches = (s: PresetStreamer, q: string) =>
  s.name.toLowerCase().includes(q) ||
  s.twitchChannel.toLowerCase().includes(q) ||
  s.youtubeChannelName.toLowerCase().includes(q) ||
  (s.youtubeHandle?.toLowerCase().includes(q) ?? false) ||
  (s.description?.toLowerCase().includes(q) ?? false) ||
  (s.category === 'dota' && (q.includes('dota') || (q.length >= 2 && 'dota 2'.startsWith(q))));

const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.025 } } };

const formatAgo = (timestamp: number) => {
  const mins = Math.round((Date.now() - timestamp) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export const StreamQuickSearchModal: React.FC<StreamQuickSearchModalProps> = (props) => (
  <AnimatePresence>{props.isOpen && <ModalContent {...props} />}</AnimatePresence>
);

const ModalContent: React.FC<StreamQuickSearchModalProps> = ({
  onClose,
  onSelectStreamer,
  onSelectHistory,
  onDeleteHistory,
  history,
  favorites,
  onToggleFavorite,
  currentTwitchChannel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(dialogRef, true);

  const q = searchTerm.toLowerCase().trim();

  const sections = useMemo(() => {
    const favoriteStreamers = favorites
      .map((c) => findPresetByChannel(c) || { name: c, twitchChannel: c, youtubeChannelName: c, youtubeHandle: c })
      .filter((s) => !q || matches(s, q));
    const notFav = (s: PresetStreamer) => !favorites.includes(s.twitchChannel.toLowerCase());
    return [
      { id: 'favorites', title: 'Favourites', items: favoriteStreamers },
      { id: 'dota', title: 'Dota 2', items: DOTA_STREAMERS.filter((s) => notFav(s) && (!q || matches(s, q))) },
      { id: 'more', title: 'More multistreamers', items: VARIETY_STREAMERS.filter((s) => notFav(s) && (!q || matches(s, q))) },
    ].filter((section) => section.items.length > 0);
  }, [favorites, q]);

  const recent = useMemo(
    () =>
      history
        .filter((h) => !q || h.twitchChannel.toLowerCase().includes(q) || h.name?.toLowerCase().includes(q))
        .slice(0, 6),
    [history, q]
  );

  const customChannel = q ? extractTwitchChannel(searchTerm) : null;
  const isKnownChannel = customChannel ? POPULAR_MULTISTREAMERS.some((s) => s.twitchChannel === customChannel) : false;

  const selectCustom = () => {
    if (!customChannel) return;
    onSelectStreamer({
      name: customChannel,
      twitchChannel: customChannel,
      youtubeChannelName: customChannel,
      youtubeHandle: customChannel,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const options = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('[data-streamer-option]') || []);
    if (options.length === 0) return;
    e.preventDefault();
    const index = options.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'ArrowDown' ? (index + 1) % options.length : index <= 0 ? options.length - 1 : index - 1;
    options[next].focus();
  };

  const handleSearchEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const first = sections[0]?.items[0];
    if (first && q) onSelectStreamer(first);
    else if (customChannel) selectCustom();
  };

  const hasResults = sections.length > 0 || recent.length > 0;

  return (
    <m.div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <m.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 4 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        className="bg-[#1f1f25] border border-white/10 w-full max-w-2xl max-h-[min(640px,calc(100dvh-1.5rem))] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <h2 id={titleId} className="sr-only">
          Find a stream
        </h2>

        <div className="flex items-center gap-2 px-4 border-b border-white/10">
          <Search className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
          <label htmlFor="stream-search" className="sr-only">
            Search streamers or type a Twitch channel
          </label>
          <input
            id="stream-search"
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchEnter}
            placeholder="Search streamers or type a Twitch channel…"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="flex-1 min-w-0 py-4 bg-transparent text-white placeholder-gray-400 text-base sm:text-sm focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 -mr-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-5 custom-scrollbar">
          {sections.map((section) => (
            <section key={section.id} aria-labelledby={`section-${section.id}`}>
              <h3 id={`section-${section.id}`} className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
                {section.title}
              </h3>
              <m.ul
                variants={listVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 gap-2"
              >
                {section.items.map((streamer) => (
                  <StreamerTile
                    key={streamer.twitchChannel}
                    streamer={streamer}
                    isFavorite={favorites.includes(streamer.twitchChannel.toLowerCase())}
                    isActive={currentTwitchChannel?.toLowerCase() === streamer.twitchChannel.toLowerCase()}
                    onSelect={onSelectStreamer}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </m.ul>
            </section>
          ))}

          {customChannel && !isKnownChannel && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-white/[0.04] border border-white/10">
              <button
                type="button"
                data-streamer-option
                onClick={selectCustom}
                className="flex-1 flex items-center gap-2 text-left text-sm text-white rounded-md"
              >
                <Play className="w-4 h-4 text-purple-400 fill-current shrink-0" aria-hidden="true" />
                <span>
                  Watch <span className="font-semibold">{customChannel}</span>
                  <span className="text-gray-400"> — Twitch chat + YouTube @{customChannel}</span>
                </span>
              </button>
              <a
                href={generateYoutubeLiveSearchUrl(searchTerm.trim())}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-gray-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors self-start sm:self-auto"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                Search YouTube Live<span className="sr-only"> (new tab)</span>
              </a>
            </div>
          )}

          {recent.length > 0 && (
            <section aria-labelledby="section-recent">
              <h3 id="section-recent" className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
                Recent
              </h3>
              <ul className="space-y-1">
                {recent.map((item) => (
                  <li key={item.id} className="group flex items-center gap-1 rounded-lg hover:bg-white/[0.04]">
                    <button
                      type="button"
                      data-streamer-option
                      onClick={() => onSelectHistory(item)}
                      className="flex-1 min-w-0 flex items-center gap-2.5 px-2 py-2 text-left rounded-lg"
                    >
                      <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                      <span className="text-sm text-white truncate">{findPresetByChannel(item.twitchChannel)?.name || item.name || item.twitchChannel}</span>
                      <span className="text-xs text-gray-400 shrink-0">{formatAgo(item.timestamp)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteHistory(item.id)}
                      aria-label={`Remove ${item.name || item.twitchChannel} from recent`}
                      className="p-1.5 mr-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-opacity [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!hasResults && !customChannel && (
            <p className="text-center text-sm text-gray-400 py-8">No streamers match “{searchTerm}”.</p>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 border-t border-white/10 text-[11px] text-gray-400">
          <span><kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> navigate</span>
          <span><kbd className="kbd">Enter</kbd> watch</span>
          <span><kbd className="kbd">Esc</kbd> close</span>
        </div>
      </m.div>
    </m.div>
  );
};
