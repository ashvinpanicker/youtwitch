import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ExternalLink,
  Maximize,
  Minimize,
  ChevronUp,
  ChevronDown,
  Search,
  Share2,
  Check,
  Sparkles,
  Tv,
  MessageSquare,
  HelpCircle,
  Star,
  Clipboard,
  Radio,
  X,
  Loader2
} from 'lucide-react';
import {
  extractYoutubeId,
  extractYoutubeHandle,
  extractTwitchChannel,
  parseStreamParamsFromUrl,
  updateBrowserUrl,
  buildShareableUrl,
  generateYoutubeLiveSearchUrl,
  generateYoutubeChannelLiveUrl,
} from '../utils/urlParser';
import { POPULAR_MULTISTREAMERS } from '../utils/presets';
import { PresetStreamer, StreamHistoryItem } from '../types/stream';
import { resolveYoutubeLiveStream } from '../utils/youtubeLiveResolver';
import { StreamQuickSearchModal } from './StreamQuickSearchModal';

const HISTORY_STORAGE_KEY = 'youtwitch_stream_history';

const StreamViewer: React.FC = () => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [twitchUrl, setTwitchUrl] = useState('');
  const [activeYoutubeId, setActiveYoutubeId] = useState<string | null>(null);
  const [activeTwitchChannel, setActiveTwitchChannel] = useState<string | null>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [chatWidth, setChatWidth] = useState(340);
  const [isChatHidden, setIsChatHidden] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTabMobile, setActiveTabMobile] = useState<'stream' | 'chat'>('stream');
  const [history, setHistory] = useState<StreamHistoryItem[]>([]);
  const [urlTipVisible, setUrlTipVisible] = useState(false);
  const [pasteToast, setPasteToast] = useState<string | null>(null);
  const [isResolvingLive, setIsResolvingLive] = useState(false);

  const mouseTimer = useRef<NodeJS.Timeout | null>(null);
  const [showToggleButton, setShowToggleButton] = useState(false);
  const toggleButtonTimer = useRef<NodeJS.Timeout | null>(null);

  // Load history & preferences on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error('Failed to parse history from localStorage', e);
    }

    const savedChatWidth = localStorage.getItem('streamViewer_chatWidth');
    if (savedChatWidth) setChatWidth(parseInt(savedChatWidth, 10));
  }, []);

  // Save history to localStorage
  const saveHistory = (items: StreamHistoryItem[]) => {
    setHistory(items);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save history', e);
    }
  };

  const addStreamToHistory = useCallback((ytId: string, twChannel: string, streamerName?: string) => {
    setHistory((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.youtubeId === ytId && item.twitchChannel.toLowerCase() === twChannel.toLowerCase()
      );

      let updated = [...prev];
      if (existingIndex >= 0) {
        const [existing] = updated.splice(existingIndex, 1);
        updated.unshift({ ...existing, timestamp: Date.now() });
      } else {
        const newItem: StreamHistoryItem = {
          id: `${ytId}_${twChannel}_${Date.now()}`,
          youtubeId: ytId,
          twitchChannel: twChannel,
          name: streamerName || `${twChannel}`,
          timestamp: Date.now(),
        };
        updated.unshift(newItem);
        if (updated.length > 20) {
          updated = updated.slice(0, 20);
        }
      }
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, []);

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.map((item) =>
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    );
    saveHistory(updated);
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((item) => item.id !== id);
    saveHistory(updated);
  };

  // 1. Initial Load & URL Route / Query Parameter Handling
  useEffect(() => {
    const handleUrlRoute = async () => {
      const parsed = parseStreamParamsFromUrl();
      console.log('Parsed stream params from URL:', parsed);

      if (parsed.youtubeId && parsed.twitchChannel) {
        setActiveYoutubeId(parsed.youtubeId);
        setActiveTwitchChannel(parsed.twitchChannel);
        setYoutubeUrl(`https://youtube.com/watch?v=${parsed.youtubeId}`);
        setTwitchUrl(`https://twitch.tv/${parsed.twitchChannel}`);
        addStreamToHistory(parsed.youtubeId, parsed.twitchChannel);
      } else if (parsed.youtubeHandle && parsed.twitchChannel) {
        setYoutubeUrl(`https://youtube.com/@${parsed.youtubeHandle}`);
        setTwitchUrl(`https://twitch.tv/${parsed.twitchChannel}`);
        setActiveTwitchChannel(parsed.twitchChannel);
        // Auto resolve live stream
        const resolved = await resolveYoutubeLiveStream(`@${parsed.youtubeHandle}`);
        if (resolved.videoId) {
          setActiveYoutubeId(resolved.videoId);
          addStreamToHistory(resolved.videoId, parsed.twitchChannel);
        } else if (resolved.channelId) {
          setActiveYoutubeId(resolved.channelId);
        }
      } else if (parsed.singleStreamer || parsed.twitchChannel) {
        const channel = parsed.singleStreamer || parsed.twitchChannel!;
        setTwitchUrl(`https://twitch.tv/${channel}`);
        const matchingPreset = POPULAR_MULTISTREAMERS.find(
          (p) => p.twitchChannel.toLowerCase() === channel.toLowerCase()
        );
        if (matchingPreset) {
          const handle = matchingPreset.youtubeHandle || matchingPreset.youtubeChannelName;
          setYoutubeUrl(`https://youtube.com/@${handle}`);
          if (matchingPreset.youtubeChannelId) {
            setActiveYoutubeId(matchingPreset.youtubeChannelId);
            setActiveTwitchChannel(channel);
          }
        }
      } else {
        const savedYtUrl = localStorage.getItem('streamViewer_youtubeUrl');
        const savedTwUrl = localStorage.getItem('streamViewer_twitchUrl');
        const savedYtId = localStorage.getItem('streamViewer_activeYoutubeId');
        const savedTwChannel = localStorage.getItem('streamViewer_activeTwitchChannel');

        if (savedYtUrl) setYoutubeUrl(savedYtUrl);
        if (savedTwUrl) setTwitchUrl(savedTwUrl);
        if (savedYtId && savedTwChannel) {
          setActiveYoutubeId(savedYtId);
          setActiveTwitchChannel(savedTwChannel);
        }
      }
    };

    handleUrlRoute();

    window.addEventListener('popstate', handleUrlRoute);
    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, [addStreamToHistory]);

  // Sync to browser URL bar & localStorage when active stream changes
  useEffect(() => {
    if (activeYoutubeId && activeTwitchChannel) {
      updateBrowserUrl(activeYoutubeId, activeTwitchChannel);
      localStorage.setItem('streamViewer_activeYoutubeId', activeYoutubeId);
      localStorage.setItem('streamViewer_activeTwitchChannel', activeTwitchChannel);
    }
  }, [activeYoutubeId, activeTwitchChannel]);

  useEffect(() => {
    if (youtubeUrl) localStorage.setItem('streamViewer_youtubeUrl', youtubeUrl);
  }, [youtubeUrl]);

  useEffect(() => {
    if (twitchUrl) localStorage.setItem('streamViewer_twitchUrl', twitchUrl);
  }, [twitchUrl]);

  useEffect(() => {
    localStorage.setItem('streamViewer_chatWidth', chatWidth.toString());
  }, [chatWidth]);

  // Keyboard shortcut for quick search modal (⌘K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const directVideoId = extractYoutubeId(youtubeUrl);
  const detectedHandle = !directVideoId ? extractYoutubeHandle(youtubeUrl) || (youtubeUrl.trim().startsWith('@') ? youtubeUrl.trim().substring(1) : null) : null;
  const isGenericYoutubeText = youtubeUrl.trim().length >= 2;
  const isValidYoutube = directVideoId !== null || detectedHandle !== null || youtubeUrl.includes('youtube.com') || isGenericYoutubeText;
  const isValidTwitch = twitchUrl.trim() !== '' && extractTwitchChannel(twitchUrl) !== null;
  const canLoadStream = isValidYoutube && isValidTwitch;

  const initialiseStreamAndChat = async () => {
    const twitchChannel = extractTwitchChannel(twitchUrl);
    if (!twitchChannel) return;

    // 1. Direct Video ID
    const directYtId = extractYoutubeId(youtubeUrl);
    if (directYtId) {
      setActiveYoutubeId(directYtId);
      setActiveTwitchChannel(twitchChannel);
      addStreamToHistory(directYtId, twitchChannel);
      return;
    }

    // 2. Channel Handle or URL
    setIsResolvingLive(true);
    try {
      const resolved = await resolveYoutubeLiveStream(youtubeUrl);
      if (resolved.videoId) {
        setActiveYoutubeId(resolved.videoId);
        setActiveTwitchChannel(twitchChannel);
        addStreamToHistory(resolved.videoId, twitchChannel, resolved.handle || twitchChannel);
      } else if (resolved.channelId) {
        // Embed by channel ID
        setActiveYoutubeId(resolved.channelId);
        setActiveTwitchChannel(twitchChannel);
        addStreamToHistory(resolved.channelId, twitchChannel, resolved.handle || twitchChannel);
      } else {
        // Fallback: Check if we can match a preset
        const handle = detectedHandle || youtubeUrl.trim().replace(/^@/, '');
        const preset = POPULAR_MULTISTREAMERS.find(
          (p) =>
            p.youtubeChannelName.toLowerCase() === handle.toLowerCase() ||
            p.twitchChannel.toLowerCase() === handle.toLowerCase()
        );
        if (preset?.youtubeChannelId) {
          setActiveYoutubeId(preset.youtubeChannelId);
          setActiveTwitchChannel(twitchChannel);
        } else {
          setPasteToast(`Could not auto-detect active live stream. Click "Open Live" to grab link.`);
          setTimeout(() => setPasteToast(null), 5000);
        }
      }
    } catch {
      setPasteToast('Error resolving live stream.');
      setTimeout(() => setPasteToast(null), 3000);
    } finally {
      setIsResolvingLive(false);
    }
  };

  const handleSelectPresetStreamer = async (streamer: PresetStreamer, youtubeVideoId?: string) => {
    const channel = streamer.twitchChannel;
    setTwitchUrl(`https://twitch.tv/${channel}`);

    if (youtubeVideoId) {
      setYoutubeUrl(`https://youtube.com/watch?v=${youtubeVideoId}`);
      setActiveYoutubeId(youtubeVideoId);
      setActiveTwitchChannel(channel);
      addStreamToHistory(youtubeVideoId, channel, streamer.name);
      setIsSearchModalOpen(false);
      return;
    }

    const handle = streamer.youtubeHandle || streamer.youtubeChannelName;
    setYoutubeUrl(`https://youtube.com/@${handle}`);

    // If channelId is present, we can immediately set active or resolve live
    if (streamer.youtubeChannelId) {
      setActiveYoutubeId(streamer.youtubeChannelId);
      setActiveTwitchChannel(channel);
    }

    setIsSearchModalOpen(false);

    // Resolve exact video ID in background
    const resolved = await resolveYoutubeLiveStream(streamer.youtubeChannelId || `@${handle}`);
    if (resolved.videoId) {
      setActiveYoutubeId(resolved.videoId);
      setActiveTwitchChannel(channel);
      addStreamToHistory(resolved.videoId, channel, streamer.name);
    }
  };

  const handleSelectHistory = (item: StreamHistoryItem) => {
    setYoutubeUrl(item.youtubeId.startsWith('UC') ? item.youtubeId : `https://youtube.com/watch?v=${item.youtubeId}`);
    setTwitchUrl(`https://twitch.tv/${item.twitchChannel}`);
    setActiveYoutubeId(item.youtubeId);
    setActiveTwitchChannel(item.twitchChannel);
    setIsSearchModalOpen(false);
  };

  const handlePasteToYoutubeInput = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const ytId = extractYoutubeId(text);
      if (ytId) {
        setYoutubeUrl(`https://youtube.com/watch?v=${ytId}`);
        const tw = extractTwitchChannel(twitchUrl);
        if (tw) {
          setActiveYoutubeId(ytId);
          setActiveTwitchChannel(tw);
          addStreamToHistory(ytId, tw);
        }
        setPasteToast('✓ YouTube Stream link pasted and loaded!');
        setTimeout(() => setPasteToast(null), 3000);
      } else {
        setYoutubeUrl(text);
        setPasteToast('Pasted content into input.');
        setTimeout(() => setPasteToast(null), 3000);
      }
    } catch {
      setPasteToast('Clipboard permission required.');
      setTimeout(() => setPasteToast(null), 3000);
    }
  };

  const handleCopyShareLink = () => {
    if (!activeYoutubeId || !activeTwitchChannel) return;
    const shareUrl = buildShareableUrl(activeYoutubeId, activeTwitchChannel);
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Fullscreen functionality
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Mouse activity tracking for auto-hide controls
  const resetMouseTimer = useCallback(() => {
    if (mouseTimer.current) {
      clearTimeout(mouseTimer.current);
    }

    setShowControls(true);

    if (activeYoutubeId && activeTwitchChannel) {
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 5000);
      mouseTimer.current = timer;
    }
  }, [activeYoutubeId, activeTwitchChannel]);

  useEffect(() => {
    if (activeYoutubeId && activeTwitchChannel) {
      document.addEventListener('mousemove', resetMouseTimer);
      document.addEventListener('mousedown', resetMouseTimer);
      document.addEventListener('keydown', resetMouseTimer);
      resetMouseTimer();
    } else {
      setShowControls(true);
      if (mouseTimer.current) {
        clearTimeout(mouseTimer.current);
        mouseTimer.current = null;
      }
    }

    return () => {
      document.removeEventListener('mousemove', resetMouseTimer);
      document.removeEventListener('mousedown', resetMouseTimer);
      document.removeEventListener('keydown', resetMouseTimer);
      if (mouseTimer.current) {
        clearTimeout(mouseTimer.current);
      }
    };
  }, [activeYoutubeId, activeTwitchChannel, resetMouseTimer]);

  // Mouse activity tracking for toggle button smooth fade in / out
  const [isHoveringToggleButton, setIsHoveringToggleButton] = useState(false);
  const isHoveringToggleButtonRef = useRef(false);

  useEffect(() => {
    isHoveringToggleButtonRef.current = isHoveringToggleButton;
  }, [isHoveringToggleButton]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // If mouse is within 80px from the top of the screen
      if (event.clientY < 80) {
        setShowToggleButton(true);
        if (toggleButtonTimer.current) {
          clearTimeout(toggleButtonTimer.current);
          toggleButtonTimer.current = null;
        }
      } else {
        // When mouse moves down away from top area, smoothly fade away after 1.2s if not hovering
        if (!isHoveringToggleButtonRef.current && !toggleButtonTimer.current) {
          toggleButtonTimer.current = setTimeout(() => {
            setShowToggleButton(false);
            toggleButtonTimer.current = null;
          }, 1200);
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (toggleButtonTimer.current) {
        clearTimeout(toggleButtonTimer.current);
      }
    };
  }, []);

  const hostname = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
  const headerVisibleState = isHeaderVisible && showControls;
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://youtwitch.app';

  // Construct iframe embed src
  const youtubeEmbedSrc = activeYoutubeId
    ? activeYoutubeId.startsWith('UC')
      ? `https://www.youtube.com/embed/live_stream?channel=${activeYoutubeId}&autoplay=1&mute=0`
      : `https://www.youtube.com/embed/${activeYoutubeId}?autoplay=1&mute=0`
    : '';

  return (
    <div className="min-h-screen bg-background text-white flex flex-col selection:bg-purple-600 selection:text-white overflow-hidden">
      {/* Search & Discovery Modal */}
      <StreamQuickSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectStreamer={handleSelectPresetStreamer}
        onSelectHistory={handleSelectHistory}
        onToggleFavorite={handleToggleFavorite}
        onDeleteHistory={handleDeleteHistory}
        history={history}
        currentYtId={activeYoutubeId}
        currentTwitchChannel={activeTwitchChannel}
      />

      {/* Header Container */}
      <header
        className={`bg-gray-900/95 backdrop-blur-md border-b border-gray-800 transition-all duration-300 z-30 ${
          headerVisibleState
            ? 'max-h-[260px] opacity-100 py-3 shadow-xl'
            : 'max-h-0 opacity-0 py-0 overflow-hidden pointer-events-none border-b-0'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4">
          {/* Top Bar: Title, Search Button, Presets, Actions */}
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-3">
              <a href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-red-600 flex items-center justify-center shadow-md shadow-purple-900/30 group-hover:scale-105 transition-transform">
                  <img src="/favicon.svg" alt="YouTwitch Logo" className="w-5 h-5 rounded-sm" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                    YouTwitch
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Dual Stream
                    </span>
                  </span>
                </div>
              </a>

              {/* Quick Streamer Search Trigger Button */}
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-800/90 hover:bg-gray-700/90 border border-gray-700 rounded-lg text-xs text-gray-300 hover:text-white transition-all shadow-sm"
                title="Search Streamers, URL shortcuts & history (⌘K)"
              >
                <Search className="w-3.5 h-3.5 text-purple-400" />
                <span>Find Live Streams</span>
                <kbd className="text-[10px] bg-gray-900 px-1.5 py-0.5 rounded text-gray-400 font-mono border border-gray-700">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Popular Multi-Streamer Quick Chips (Desktop) */}
            <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar max-w-md">
              <span className="text-[11px] text-gray-400 flex items-center gap-1 shrink-0 mr-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Quick:
              </span>
              {POPULAR_MULTISTREAMERS.slice(0, 6).map((streamer) => (
                <button
                  key={streamer.twitchChannel}
                  onClick={() => handleSelectPresetStreamer(streamer)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all shrink-0 ${
                    activeTwitchChannel?.toLowerCase() === streamer.twitchChannel.toLowerCase()
                      ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                      : 'bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-700'
                  }`}
                >
                  {streamer.name}
                </button>
              ))}
            </div>

            {/* Right Action Controls */}
            <div className="flex items-center gap-1.5">
              {/* URL Tip Trigger */}
              <button
                onClick={() => setUrlTipVisible(!urlTipVisible)}
                className={`p-2 rounded-lg text-xs transition-colors border ${
                  urlTipVisible
                    ? 'bg-purple-600/30 text-purple-300 border-purple-500/50'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800 border-transparent'
                }`}
                title="How direct URL routing works"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              {/* Share Current Stream Link Button */}
              {activeYoutubeId && activeTwitchChannel && (
                <button
                  onClick={handleCopyShareLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs font-medium text-purple-300 hover:text-white transition-all shadow-sm"
                  title="Copy shareable direct stream URL"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
                </button>
              )}

              {/* Chat Width Adjustment */}
              {activeYoutubeId && activeTwitchChannel && (
                <div className="hidden md:flex items-center bg-gray-800/80 border border-gray-700 rounded-lg p-0.5 text-xs text-gray-300">
                  <button
                    onClick={() => {
                      setIsChatHidden(false);
                      setChatWidth(300);
                    }}
                    className={`px-2 py-1 rounded transition-colors ${
                      !isChatHidden && chatWidth === 300 ? 'bg-purple-600 text-white' : 'hover:text-white'
                    }`}
                    title="Compact chat (300px)"
                  >
                    300
                  </button>
                  <button
                    onClick={() => {
                      setIsChatHidden(false);
                      setChatWidth(360);
                    }}
                    className={`px-2 py-1 rounded transition-colors ${
                      !isChatHidden && chatWidth === 360 ? 'bg-purple-600 text-white' : 'hover:text-white'
                    }`}
                    title="Standard chat (360px)"
                  >
                    360
                  </button>
                  <button
                    onClick={() => {
                      setIsChatHidden(false);
                      setChatWidth(440);
                    }}
                    className={`px-2 py-1 rounded transition-colors ${
                      !isChatHidden && chatWidth === 440 ? 'bg-purple-600 text-white' : 'hover:text-white'
                    }`}
                    title="Wide chat (440px)"
                  >
                    440
                  </button>
                  <button
                    onClick={() => setIsChatHidden(!isChatHidden)}
                    className={`px-2 py-1 rounded transition-colors ${
                      isChatHidden ? 'bg-purple-600 text-white' : 'hover:text-white'
                    }`}
                    title={isChatHidden ? 'Show chat' : 'Hide chat'}
                  >
                    {isChatHidden ? 'Show Chat' : 'Hide'}
                  </button>
                </div>
              )}

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* URL Tip Dropdown Notification */}
          {urlTipVisible && (
            <div className="mb-2.5 p-3 bg-purple-950/60 border border-purple-700/60 rounded-xl text-xs flex items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-gray-300">
                  <strong>Direct URL Shortcut:</strong> Jump to any stream directly with{' '}
                  <code className="bg-gray-900 text-purple-300 px-1.5 py-0.5 rounded border border-gray-700 font-mono">
                    {currentOrigin}/&lt;youtube_id&gt;/&lt;twitch_channel&gt;
                  </code>{' '}
                  or{' '}
                  <code className="bg-gray-900 text-red-300 px-1.5 py-0.5 rounded border border-gray-700 font-mono">
                    {currentOrigin}/&lt;streamer_name&gt;
                  </code>
                </span>
              </div>
              <button
                onClick={() => setUrlTipVisible(false)}
                className="text-gray-400 hover:text-white text-xs px-2 py-1 hover:bg-gray-800 rounded"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Paste Toast */}
          {pasteToast && (
            <div className="mb-2 p-2 bg-purple-900/80 border border-purple-600/60 rounded-lg text-xs text-purple-100 flex items-center justify-between animate-fadeIn">
              <span>{pasteToast}</span>
              <button onClick={() => setPasteToast(null)} className="text-purple-300 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Input Fields Row: YouTube URL + Twitch URL + Go */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
            {/* YouTube Input */}
            <div className="md:col-span-5">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  YouTube Stream (URL, @channel, or Video ID)
                </label>
                {youtubeUrl && (
                  <span
                    className={`text-[11px] ${
                      directVideoId
                        ? 'text-green-400'
                        : detectedHandle
                        ? 'text-amber-400'
                        : 'text-purple-400'
                    }`}
                  >
                    {directVideoId
                      ? '✓ Direct Video ID'
                      : detectedHandle
                      ? `Channel @${detectedHandle}`
                      : '✓ Ready'}
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && canLoadStream && initialiseStreamAndChat()}
                  placeholder="e.g. https://youtube.com/@zeeddota2 or video link"
                  className={`w-full pl-3 pr-20 py-2 bg-gray-800/90 border rounded-lg text-sm focus:outline-none transition-colors ${
                    youtubeUrl && !isValidYoutube
                      ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                      : youtubeUrl && directVideoId
                      ? 'border-green-500/80 focus:ring-1 focus:ring-green-500'
                      : detectedHandle
                      ? 'border-amber-500/80 focus:ring-1 focus:ring-amber-500'
                      : 'border-gray-700 focus:border-purple-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={handlePasteToYoutubeInput}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                  title="Paste link from clipboard"
                >
                  <Clipboard className="w-3 h-3 text-purple-400" />
                  Paste
                </button>
              </div>

              {/* Channel Handle Action Helper */}
              {detectedHandle && (
                <div className="mt-1.5 p-2 bg-amber-950/40 border border-amber-600/40 rounded-lg flex items-center justify-between gap-2 text-xs animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-amber-200">
                    <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse shrink-0" />
                    <span className="truncate">Channel @{detectedHandle}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={generateYoutubeChannelLiveUrl(detectedHandle)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-medium flex items-center gap-1 text-[11px] transition-colors"
                      title="Open live stream page on YouTube"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Live
                    </a>
                    <button
                      onClick={handlePasteToYoutubeInput}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-[11px] flex items-center gap-1 transition-colors"
                      title="Paste copied link"
                    >
                      <Clipboard className="w-3 h-3 text-purple-400" />
                      Paste Link
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Twitch Input */}
            <div className="md:col-span-5">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  Twitch Chat (Channel Name or URL)
                </label>
                {twitchUrl && (
                  <span
                    className={`text-[11px] ${
                      isValidTwitch ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {isValidTwitch ? '✓ Valid Channel' : '✕ Enter valid Twitch channel'}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={twitchUrl}
                onChange={(e) => setTwitchUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canLoadStream && initialiseStreamAndChat()}
                placeholder="e.g. zeeddota or https://twitch.tv/zeeddota"
                className={`w-full px-3 py-2 bg-gray-800/90 border rounded-lg text-sm focus:outline-none transition-colors ${
                  twitchUrl && !isValidTwitch
                    ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                    : twitchUrl && isValidTwitch
                    ? 'border-green-500/80 focus:ring-1 focus:ring-green-500'
                    : 'border-gray-700 focus:border-purple-500'
                }`}
              />
            </div>

            {/* Action Buttons */}
            <div className="md:col-span-2 flex items-center gap-2 pt-5">
              <button
                onClick={initialiseStreamAndChat}
                disabled={!canLoadStream || isResolvingLive}
                className="flex-1 py-2 px-4 bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-500 hover:to-red-500 text-white rounded-lg font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-1.5 shadow-lg shadow-purple-900/30 whitespace-nowrap"
              >
                {isResolvingLive ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Finding...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Go Live
                  </>
                )}
              </button>

              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 rounded-lg transition-colors md:hidden"
                title="Search Streamers"
              >
                <Search className="w-4 h-4 text-purple-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Invisible hover trigger zone at the very top of the screen */}
      <div
        onMouseEnter={() => setShowToggleButton(true)}
        className="absolute top-0 left-0 w-full h-8 z-40 pointer-events-auto"
      />

      {/* Header Floating Toggle Button (Smooth Fade in / out) */}
      <div
        onMouseEnter={() => {
          setIsHoveringToggleButton(true);
          setShowToggleButton(true);
        }}
        onMouseLeave={() => {
          setIsHoveringToggleButton(false);
        }}
        className={`absolute top-3 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out ${
          showToggleButton
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <button
          onClick={() => setIsHeaderVisible((prev) => !prev)}
          className="px-3.5 py-1.5 bg-gray-900/90 hover:bg-gray-800 border border-gray-700 hover:border-purple-500/50 backdrop-blur-md rounded-full shadow-2xl transition-all flex items-center gap-1.5 text-xs text-gray-300 hover:text-white group"
          title={isHeaderVisible ? 'Hide controls bar' : 'Show controls bar'}
        >
          {isHeaderVisible ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
              <span>Hide Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
              <span>Show Controls</span>
            </>
          )}
        </button>
      </div>

      {/* Main Stream Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {activeYoutubeId && activeTwitchChannel ? (
          <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
            {/* Mobile Tab Switcher */}
            <div className="md:hidden flex border-b border-gray-800 bg-gray-900 text-xs">
              <button
                onClick={() => setActiveTabMobile('stream')}
                className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 font-medium ${
                  activeTabMobile === 'stream'
                    ? 'border-b-2 border-red-500 text-white bg-gray-800/50'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Tv className="w-3.5 h-3.5 text-red-500" /> YouTube Stream
              </button>
              <button
                onClick={() => setActiveTabMobile('chat')}
                className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 font-medium ${
                  activeTabMobile === 'chat'
                    ? 'border-b-2 border-purple-500 text-white bg-gray-800/50'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-purple-500" /> Twitch Chat
              </button>
            </div>

            {/* YouTube Video Player */}
            <div
              className={`flex-1 bg-black flex items-center justify-center relative ${
                activeTabMobile === 'chat' ? 'hidden md:flex' : 'flex'
              }`}
            >
              <iframe
                src={youtubeEmbedSrc}
                title="YouTube Stream Player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              />
            </div>

            {/* Twitch Chat Sidebar */}
            {!isChatHidden && (
              <div
                className={`bg-gray-950 border-l border-gray-800 flex flex-col transition-all duration-200 ${
                  activeTabMobile === 'stream' ? 'hidden md:flex' : 'flex h-full'
                }`}
                style={{
                  width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${chatWidth}px` : '100%',
                }}
              >
                <iframe
                  src={`https://www.twitch.tv/embed/${activeTwitchChannel}/chat?parent=${hostname}&darkpopout=true`}
                  title="Twitch Chat"
                  frameBorder="0"
                  scrolling="no"
                  className="w-full h-full"
                />
              </div>
            )}
          </div>
        ) : (
          /* Empty / Welcome State */
          <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-y-auto">
            <div className="max-w-2xl w-full text-center space-y-6">
              {/* Hero Icon */}
              <div className="relative inline-flex items-center justify-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-red-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 animate-pulse">
                  <img src="/favicon.svg" alt="YouTwitch Logo" className="w-12 h-12 rounded-lg" />
                </div>
              </div>

              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  The Best Way to Watch YouTube + Twitch Chat
                </h2>
                <p className="text-gray-400 text-sm md:text-base mt-2 max-w-lg mx-auto">
                  Watch high-bitrate YouTube live streams on the left with ultra-fast Twitch chat on the right.
                </p>
              </div>

              {/* Quick Streamer Search Bar Hero */}
              <div className="bg-gray-900/90 border border-gray-700/80 rounded-2xl p-4 shadow-xl">
                <button
                  onClick={() => setIsSearchModalOpen(true)}
                  className="w-full py-3.5 px-4 bg-gray-800 hover:bg-gray-750 border border-gray-600/80 hover:border-purple-500 rounded-xl text-left flex items-center justify-between text-gray-300 hover:text-white transition-all group shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <Search className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-gray-300">
                      Search multi-streamer (zeeddota, Tarik, Ludwig, Shroud)...
                    </span>
                  </div>
                  <span className="text-xs bg-purple-600/30 text-purple-300 border border-purple-500/40 px-2.5 py-1 rounded-md font-medium">
                    Open Finder (⌘K)
                  </span>
                </button>

                {/* Popular Multi-Streamers Quick Grid */}
                <div className="mt-4 pt-4 border-t border-gray-800 text-left">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Popular Multi-Streamers:
                    </span>
                    <button
                      onClick={() => setIsSearchModalOpen(true)}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {POPULAR_MULTISTREAMERS.slice(0, 8).map((streamer) => (
                      <button
                        key={streamer.twitchChannel}
                        onClick={() => handleSelectPresetStreamer(streamer)}
                        className="p-2.5 bg-gray-800/80 hover:bg-gray-750 hover:border-purple-500/50 border border-gray-700/80 rounded-xl text-left transition-all flex items-center gap-2 group"
                      >
                        <div
                          className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${streamer.color || 'from-purple-600 to-red-600'} flex items-center justify-center font-bold text-[10px] text-white shrink-0`}
                        >
                          {streamer.avatarText || streamer.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate group-hover:text-purple-300">
                            {streamer.name}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate">
                            @{streamer.twitchChannel}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Direct URL Tip Card */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 text-left">
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                  Direct URL Shortcuts & Live Stream Finder
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Navigate directly or paste channel handles:
                </p>
                <div className="mt-2.5 flex flex-col sm:flex-row gap-2 font-mono text-xs">
                  <div className="flex-1 bg-gray-950 p-2.5 rounded-lg border border-gray-800 text-purple-300 break-all">
                    {currentOrigin}/<span className="text-red-400">&lt;youtube_id&gt;</span>/<span className="text-purple-400">&lt;twitch_channel&gt;</span>
                  </div>
                  <div className="flex-1 bg-gray-950 p-2.5 rounded-lg border border-gray-800 text-purple-300 break-all">
                    {currentOrigin}/<span className="text-amber-400">&lt;streamer_name&gt;</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StreamViewer;