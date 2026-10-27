import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnimatePresence, m } from 'motion/react';
import {
  Maximize,
  Minimize,
  Search,
  Share2,
  Check,
  MessageSquare,
  MessageSquareOff,
  SlidersHorizontal,
  Pin,
  PinOff,
  X,
} from 'lucide-react';
import {
  extractYoutubeId,
  extractYoutubeHandle,
  extractTwitchChannel,
  parseStreamParamsFromUrl,
  updateBrowserUrl,
  buildShareableUrl,
  extractYoutubeChannelId,
  youtubeInputForId,
} from '../utils/urlParser';
import { POPULAR_MULTISTREAMERS, findPresetByChannel } from '../utils/presets';
import { PresetStreamer, StreamHistoryItem } from '../types/stream';
import { resolveYoutubeLiveStream } from '../utils/youtubeLiveResolver';
import { useFavorites } from '../hooks/useFavorites';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { StreamQuickSearchModal } from './StreamQuickSearchModal';
import { SourceForm } from './SourceForm';
import { WelcomeScreen } from './WelcomeScreen';
import { StreamerAvatar } from './StreamerTile';
import { ChatResizer, CHAT_DEFAULT_WIDTH, CHAT_MIN_WIDTH, CHAT_MAX_WIDTH } from './ChatResizer';

const HISTORY_STORAGE_KEY = 'youtwitch_stream_history';
const PIN_STORAGE_KEY = 'streamViewer_toolbarPinned';
const TOOLBAR_HIDE_DELAY = 2500;

const readStorage = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore unavailable storage
  }
};

const loadHistory = (): StreamHistoryItem[] => {
  try {
    return JSON.parse(readStorage(HISTORY_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const loadChatWidth = () => {
  const saved = parseInt(readStorage('streamViewer_chatWidth') || '', 10);
  return Number.isFinite(saved) ? Math.min(CHAT_MAX_WIDTH, Math.max(CHAT_MIN_WIDTH, saved)) : CHAT_DEFAULT_WIDTH;
};

const iconButton =
  'inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors';

const StreamViewer: React.FC = () => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [twitchUrl, setTwitchUrl] = useState('');
  const [activeYoutubeId, setActiveYoutubeId] = useState<string | null>(null);
  const [activeTwitchChannel, setActiveTwitchChannel] = useState<string | null>(null);
  const [chatWidth, setChatWidth] = useState(loadChatWidth);
  const [isChatHidden, setIsChatHidden] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [history, setHistory] = useState<StreamHistoryItem[]>(loadHistory);
  const [toast, setToast] = useState<string | null>(null);
  const [isResolvingLive, setIsResolvingLive] = useState(false);
  const [isPinned, setIsPinned] = useState(() => readStorage(PIN_STORAGE_KEY) === 'true');
  const [isToolbarRevealed, setIsToolbarRevealed] = useState(true);
  const [isToolbarEngaged, setIsToolbarEngaged] = useState(false);

  const { favorites, toggleFavorite } = useFavorites();
  const canHover = useMediaQuery('(min-width: 768px) and (hover: hover)');
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const isWatching = !!activeYoutubeId && !!activeTwitchChannel;
  const currentStreamer = findPresetByChannel(activeTwitchChannel);
  const currentName = currentStreamer?.name || activeTwitchChannel || '';

  const showToast = useCallback((message: string, duration = 4000) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), duration);
  }, []);

  const favoriteStreamers = useMemo<PresetStreamer[]>(
    () =>
      favorites.map(
        (c) => findPresetByChannel(c) || { name: c, twitchChannel: c, youtubeChannelName: c, youtubeHandle: c }
      ),
    [favorites]
  );

  const saveHistory = (items: StreamHistoryItem[]) => {
    setHistory(items);
    writeStorage(HISTORY_STORAGE_KEY, JSON.stringify(items));
  };

  const addStreamToHistory = useCallback((ytId: string, twChannel: string, streamerName?: string) => {
    setHistory((prev) => {
      const existing = prev.find(
        (item) => item.youtubeId === ytId && item.twitchChannel.toLowerCase() === twChannel.toLowerCase()
      );
      const rest = prev.filter((item) => item !== existing);
      const entry: StreamHistoryItem = existing
        ? { ...existing, timestamp: Date.now() }
        : {
            id: `${ytId}_${twChannel}_${Date.now()}`,
            youtubeId: ytId,
            twitchChannel: twChannel,
            name: streamerName || twChannel,
            timestamp: Date.now(),
          };
      const updated = [entry, ...rest].slice(0, 20);
      writeStorage(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleDeleteHistory = (id: string) => saveHistory(history.filter((item) => item.id !== id));

  const startStream = useCallback(
    (ytId: string, channel: string, name?: string) => {
      setActiveYoutubeId(ytId);
      setActiveTwitchChannel(channel);
      addStreamToHistory(ytId, channel, name);
    },
    [addStreamToHistory]
  );

  /**
   * Loads a streamer. A known YouTube channel ID embeds the channel's current live
   * stream directly; otherwise we try to resolve the live video from the handle.
   */
  const loadStreamer = useCallback(
    async (streamer: PresetStreamer) => {
      const channel = streamer.twitchChannel;
      const handle = streamer.youtubeHandle || streamer.youtubeChannelName;
      setTwitchUrl(`https://twitch.tv/${channel}`);
      setYoutubeUrl(`https://youtube.com/@${handle}`);
      setIsSearchModalOpen(false);

      if (streamer.youtubeChannelId) {
        startStream(streamer.youtubeChannelId, channel, streamer.name);
        return;
      }

      setIsResolvingLive(true);
      try {
        const resolved = await resolveYoutubeLiveStream(`@${handle}`);
        const ytId = resolved.videoId || resolved.channelId;
        if (ytId) {
          startStream(ytId, channel, streamer.name);
        } else {
          setIsSourcesOpen(true);
          showToast(`Couldn’t find ${streamer.name}’s YouTube live. Open their live page and paste the link.`, 6000);
        }
      } finally {
        setIsResolvingLive(false);
      }
    },
    [startStream, showToast]
  );

  // Initial load & URL route / query parameter handling
  useEffect(() => {
    const handleUrlRoute = async () => {
      const parsed = parseStreamParamsFromUrl();

      if (parsed.youtubeId && parsed.twitchChannel) {
        setYoutubeUrl(youtubeInputForId(parsed.youtubeId));
        setTwitchUrl(`https://twitch.tv/${parsed.twitchChannel}`);
        startStream(parsed.youtubeId, parsed.twitchChannel);
      } else if (parsed.youtubeHandle && parsed.twitchChannel) {
        const preset = findPresetByChannel(parsed.twitchChannel);
        loadStreamer({
          ...(preset || { name: parsed.twitchChannel, twitchChannel: parsed.twitchChannel, youtubeChannelName: parsed.youtubeHandle }),
          youtubeHandle: parsed.youtubeHandle,
        });
      } else if (parsed.singleStreamer || parsed.twitchChannel) {
        const channel = (parsed.singleStreamer || parsed.twitchChannel)!;
        loadStreamer(
          findPresetByChannel(channel) || { name: channel, twitchChannel: channel, youtubeChannelName: channel, youtubeHandle: channel }
        );
      } else {
        const savedYtUrl = readStorage('streamViewer_youtubeUrl');
        const savedTwUrl = readStorage('streamViewer_twitchUrl');
        if (savedYtUrl) setYoutubeUrl(savedYtUrl);
        if (savedTwUrl) setTwitchUrl(savedTwUrl);
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, [startStream, loadStreamer]);

  // Sync to browser URL bar, title & localStorage when active stream changes
  useEffect(() => {
    if (activeYoutubeId && activeTwitchChannel) {
      updateBrowserUrl(activeYoutubeId, activeTwitchChannel);
      writeStorage('streamViewer_activeYoutubeId', activeYoutubeId);
      writeStorage('streamViewer_activeTwitchChannel', activeTwitchChannel);
      document.title = `${currentName} · YouTwitch`;
    }
  }, [activeYoutubeId, activeTwitchChannel, currentName]);

  useEffect(() => {
    if (youtubeUrl) writeStorage('streamViewer_youtubeUrl', youtubeUrl);
  }, [youtubeUrl]);

  useEffect(() => {
    if (twitchUrl) writeStorage('streamViewer_twitchUrl', twitchUrl);
  }, [twitchUrl]);

  useEffect(() => {
    writeStorage('streamViewer_chatWidth', chatWidth.toString());
  }, [chatWidth]);

  // Keyboard shortcuts: ⌘K / Ctrl+K or "/" opens the finder
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !isTyping)) {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const initialiseStreamAndChat = async () => {
    const twitchChannel = extractTwitchChannel(twitchUrl);
    if (!twitchChannel) return;

    const directYtId = extractYoutubeChannelId(youtubeUrl) || extractYoutubeId(youtubeUrl);
    if (directYtId) {
      startStream(directYtId, twitchChannel);
      setIsSourcesOpen(false);
      return;
    }

    setIsResolvingLive(true);
    try {
      const resolved = await resolveYoutubeLiveStream(youtubeUrl);
      const handle = extractYoutubeHandle(youtubeUrl) || youtubeUrl.trim().replace(/^@/, '');
      const preset = POPULAR_MULTISTREAMERS.find(
        (p) =>
          p.youtubeChannelName.toLowerCase() === handle.toLowerCase() ||
          p.twitchChannel.toLowerCase() === handle.toLowerCase()
      );
      const ytId = resolved.videoId || resolved.channelId || preset?.youtubeChannelId;
      if (ytId) {
        startStream(ytId, twitchChannel, resolved.handle || twitchChannel);
        setIsSourcesOpen(false);
      } else {
        showToast('Couldn’t find a live stream. Open the channel’s live page and paste the link.', 6000);
      }
    } catch {
      showToast('Error resolving live stream.');
    } finally {
      setIsResolvingLive(false);
    }
  };

  const handleSelectHistory = (item: StreamHistoryItem) => {
    setYoutubeUrl(youtubeInputForId(item.youtubeId));
    setTwitchUrl(`https://twitch.tv/${item.twitchChannel}`);
    startStream(item.youtubeId, item.twitchChannel, item.name);
    setIsSearchModalOpen(false);
  };

  const handlePasteToYoutubeInput = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const ytId = extractYoutubeId(text);
      if (!ytId) {
        setYoutubeUrl(text);
        return;
      }
      setYoutubeUrl(`https://youtube.com/watch?v=${ytId}`);
      const tw = extractTwitchChannel(twitchUrl);
      if (tw) {
        startStream(ytId, tw);
        setIsSourcesOpen(false);
        showToast('YouTube link pasted and loaded', 2500);
      }
    } catch {
      showToast('Clipboard access was blocked. Paste into the field instead.');
    }
  };

  const handleCopyShareLink = async () => {
    if (!activeYoutubeId || !activeTwitchChannel) return;
    try {
      await navigator.clipboard.writeText(buildShareableUrl(activeYoutubeId, activeTwitchChannel));
      setCopiedLink(true);
      showToast('Link copied', 2000);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      showToast('Couldn’t copy the link.');
    }
  };

  const goHome = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveYoutubeId(null);
    setActiveTwitchChannel(null);
    setIsSourcesOpen(false);
    window.history.pushState({}, '', '/');
    document.title = 'YouTwitch: YouTube Stream + Twitch Chat';
  };

  // Fullscreen
  const canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled;
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Toolbar auto-hide while watching (desktop pointer devices only, unless pinned)
  const autoHide = isWatching && canHover && !isPinned;
  const isToolbarVisible = !autoHide || isToolbarRevealed || isToolbarEngaged || isSourcesOpen || isSearchModalOpen;

  const revealToolbar = useCallback(() => {
    setIsToolbarRevealed(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setIsToolbarRevealed(false), TOOLBAR_HIDE_DELAY);
  }, []);

  useEffect(() => {
    if (!autoHide) return;
    revealToolbar();
    // Pointer events only reach us outside the iframes (toolbar, hot zone, splitter)
    const handleKeyDown = (e: KeyboardEvent) => e.key === 'Tab' && revealToolbar();
    document.addEventListener('mousemove', revealToolbar);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousemove', revealToolbar);
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(hideTimer.current);
    };
  }, [autoHide, revealToolbar]);

  const togglePinned = () => {
    setIsPinned((prev) => {
      writeStorage(PIN_STORAGE_KEY, String(!prev));
      return !prev;
    });
  };

  const hostname = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
  const youtubeEmbedSrc = activeYoutubeId
    ? activeYoutubeId.startsWith('UC')
      ? `https://www.youtube.com/embed/live_stream?channel=${activeYoutubeId}&autoplay=1`
      : `https://www.youtube.com/embed/${activeYoutubeId}?autoplay=1`
    : '';

  const sourceForm = (
    <SourceForm
      youtubeUrl={youtubeUrl}
      twitchUrl={twitchUrl}
      onYoutubeUrlChange={setYoutubeUrl}
      onTwitchUrlChange={setTwitchUrl}
      onSubmit={initialiseStreamAndChat}
      onPasteYoutube={handlePasteToYoutubeInput}
      isResolving={isResolvingLive}
    />
  );

  return (
    <div className={`bg-background text-white flex flex-col selection:bg-purple-600 ${isWatching ? 'h-dvh overflow-hidden' : 'min-h-dvh'}`}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <StreamQuickSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectStreamer={loadStreamer}
        onSelectHistory={handleSelectHistory}
        onDeleteHistory={handleDeleteHistory}
        history={history}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        currentTwitchChannel={activeTwitchChannel}
      />

      {/* Thin hot zone over the iframes that brings the toolbar back */}
      {autoHide && !isToolbarVisible && (
        <div className="absolute top-0 inset-x-0 h-4 z-40" onMouseEnter={revealToolbar} aria-hidden="true" />
      )}

      <m.header
        initial={false}
        animate={{ opacity: isToolbarVisible ? 1 : 0, y: isToolbarVisible ? 0 : -12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onMouseEnter={() => setIsToolbarEngaged(true)}
        onMouseLeave={() => setIsToolbarEngaged(false)}
        onFocus={() => setIsToolbarEngaged(true)}
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setIsToolbarEngaged(false)}
        className={`z-30 border-b border-white/[0.06] bg-[#18181C]/90 backdrop-blur-md ${
          autoHide ? 'absolute top-0 inset-x-0 shadow-lg shadow-black/30' : 'relative'
        } ${isToolbarVisible ? '' : 'pointer-events-none'}`}
      >
        <div className="flex items-center gap-2 px-3 sm:px-4 h-14">
          <a
            href="/"
            onClick={goHome}
            className="flex items-center gap-2 shrink-0 rounded-lg pr-1"
            aria-label="YouTwitch home"
          >
            <img src="/favicon.svg" alt="" width={24} height={24} className="w-6 h-6" />
            <span className={`font-semibold tracking-tight ${isWatching ? 'hidden sm:inline' : ''}`}>YouTwitch</span>
          </a>

          {isWatching && (
            <div className="flex items-center gap-2 min-w-0 pl-2 sm:ml-1 sm:border-l border-white/10">
              {currentStreamer && <StreamerAvatar streamer={currentStreamer} size="sm" />}
              <span className="text-sm font-medium truncate">{currentName}</span>
            </div>
          )}

          {/* Quick switch between favourites */}
          {isWatching && favoriteStreamers.length > 0 && (
            <nav aria-label="Favourites" className="hidden lg:flex items-center gap-1 ml-4 min-w-0 overflow-x-auto no-scrollbar">
              {favoriteStreamers.slice(0, 6).map((s) => {
                const isActive = s.twitchChannel.toLowerCase() === activeTwitchChannel?.toLowerCase();
                return (
                  <button
                    key={s.twitchChannel}
                    type="button"
                    onClick={() => loadStreamer(s)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      isActive ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => setIsSearchModalOpen(true)}
              aria-label="Find a stream"
              aria-keyshortcuts="Meta+K Control+K /"
              className={`${iconButton} sm:w-auto sm:px-3 sm:gap-2 sm:bg-white/[0.04] sm:border sm:border-white/10`}
            >
              <Search className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline text-xs text-gray-400">Find</span>
              <kbd className="kbd hidden sm:inline-block">⌘K</kbd>
            </button>

            {isWatching && (
              <>
                <button
                  type="button"
                  onClick={() => setIsSourcesOpen((prev) => !prev)}
                  aria-expanded={isSourcesOpen}
                  aria-controls="stream-sources"
                  aria-label="Edit stream sources"
                  title="Edit sources"
                  className={`${iconButton} ${isSourcesOpen ? 'bg-white/10 text-white' : ''}`}
                >
                  <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={handleCopyShareLink} aria-label="Copy share link" title="Copy share link" className={iconButton}>
                  <AnimatePresence mode="wait" initial={false}>
                    <m.span
                      key={copiedLink ? 'check' : 'share'}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.12 }}
                    >
                      {copiedLink ? (
                        <Check className="w-4 h-4 text-green-400" aria-hidden="true" />
                      ) : (
                        <Share2 className="w-4 h-4" aria-hidden="true" />
                      )}
                    </m.span>
                  </AnimatePresence>
                </button>
                <button
                  type="button"
                  onClick={() => setIsChatHidden((prev) => !prev)}
                  aria-pressed={!isChatHidden}
                  aria-label="Show chat"
                  title={isChatHidden ? 'Show chat' : 'Hide chat'}
                  className={iconButton}
                >
                  {isChatHidden ? (
                    <MessageSquareOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <MessageSquare className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
                {canHover && (
                  <button
                    type="button"
                    onClick={togglePinned}
                    aria-pressed={isPinned}
                    aria-label="Keep toolbar visible"
                    title={isPinned ? 'Auto-hide toolbar' : 'Keep toolbar visible'}
                    className={iconButton}
                  >
                    {isPinned ? <PinOff className="w-4 h-4" aria-hidden="true" /> : <Pin className="w-4 h-4" aria-hidden="true" />}
                  </button>
                )}
              </>
            )}

            {canFullscreen && (
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                className={`${iconButton} hidden sm:inline-flex`}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" aria-hidden="true" /> : <Maximize className="w-4 h-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isWatching && isSourcesOpen && (
            <m.div
              id="stream-sources"
              key="sources"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="px-3 sm:px-4 pb-3 max-w-4xl">{sourceForm}</div>
            </m.div>
          )}
        </AnimatePresence>
      </m.header>

      <main id="main" tabIndex={-1} className="flex-1 flex flex-col min-h-0 focus:outline-none">
        {isWatching ? (
          <div className="flex-1 flex flex-col md:flex-row min-h-0">
            <div className="bg-black w-full aspect-video max-h-[60dvh] md:max-h-none md:aspect-auto md:flex-1 shrink-0 md:shrink">
              <iframe
                key={youtubeEmbedSrc}
                src={youtubeEmbedSrc}
                title={`${currentName} YouTube stream`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            {!isChatHidden && (
              <>
                <ChatResizer width={chatWidth} onChange={setChatWidth} />
                <div
                  className="flex-1 min-h-0 w-full md:flex-none md:w-[var(--chat-w)] bg-[#0e0e10] md:border-l border-white/[0.06]"
                  style={{ '--chat-w': `${chatWidth}px` } as React.CSSProperties}
                >
                  <iframe
                    src={`https://www.twitch.tv/embed/${activeTwitchChannel}/chat?parent=${hostname}&darkpopout`}
                    title={`${activeTwitchChannel} Twitch chat`}
                    className="w-full h-full border-0"
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <WelcomeScreen
            favoriteStreamers={favoriteStreamers}
            favorites={favorites}
            onSelect={loadStreamer}
            onToggleFavorite={toggleFavorite}
            onOpenSearch={() => setIsSearchModalOpen(true)}
          >
            {sourceForm}
          </WelcomeScreen>
        )}
      </main>

      {/* Toasts (announced politely to screen readers) */}
      <div role="status" aria-live="polite" className="fixed bottom-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <AnimatePresence>
          {toast && (
            <m.div
              key={toast}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-auto flex items-center gap-3 max-w-md px-4 py-2.5 rounded-xl bg-[#26262c] border border-white/10 shadow-2xl text-sm text-gray-100"
            >
              <span>{toast}</span>
              <button
                type="button"
                onClick={() => setToast(null)}
                aria-label="Dismiss"
                className="p-1 -mr-1 rounded text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StreamViewer;
