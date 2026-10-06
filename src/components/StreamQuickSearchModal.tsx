import React, { useState, useMemo } from 'react';
import { Search, Sparkles, ExternalLink, Play, Clock, Star, X, Info, Check, Copy, Clipboard, Radio } from 'lucide-react';
import { POPULAR_MULTISTREAMERS } from '../utils/presets';
import { PresetStreamer, StreamHistoryItem } from '../types/stream';
import { generateYoutubeLiveSearchUrl, generateYoutubeChannelLiveUrl, extractYoutubeId } from '../utils/urlParser';

interface StreamQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStreamer: (streamer: PresetStreamer, youtubeVideoId?: string) => void;
  onSelectHistory: (item: StreamHistoryItem) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onDeleteHistory: (id: string, e: React.MouseEvent) => void;
  history: StreamHistoryItem[];
  currentYtId?: string | null;
  currentTwitchChannel?: string | null;
}

export const StreamQuickSearchModal: React.FC<StreamQuickSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectStreamer,
  onSelectHistory,
  onToggleFavorite,
  onDeleteHistory,
  history,
  currentYtId,
  currentTwitchChannel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Filter presets based on search query
  const filteredPresets = useMemo(() => {
    if (!searchTerm.trim()) return POPULAR_MULTISTREAMERS;
    const q = searchTerm.toLowerCase().trim();
    return POPULAR_MULTISTREAMERS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.twitchChannel.toLowerCase().includes(q) ||
        s.youtubeChannelName.toLowerCase().includes(q) ||
        (s.youtubeHandle && s.youtubeHandle.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [searchTerm]);

  // Filter history based on search query
  const filteredHistory = useMemo(() => {
    if (!searchTerm.trim()) return history;
    const q = searchTerm.toLowerCase().trim();
    return history.filter(
      (h) =>
        h.twitchChannel.toLowerCase().includes(q) ||
        h.youtubeId.toLowerCase().includes(q) ||
        (h.name && h.name.toLowerCase().includes(q))
    );
  }, [history, searchTerm]);

  if (!isOpen) return null;

  const handleCopyExample = (exampleUrl: string) => {
    navigator.clipboard.writeText(exampleUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handlePasteAndLoadStreamer = async (streamer: PresetStreamer) => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      const ytId = extractYoutubeId(clipboardText);
      if (ytId) {
        onSelectStreamer(streamer, ytId);
        setPasteError(null);
      } else {
        setPasteError(`No YouTube video ID found in clipboard for ${streamer.name}. Copied: "${clipboardText.substring(0, 30)}..."`);
        setTimeout(() => setPasteError(null), 4000);
      }
    } catch {
      setPasteError('Clipboard access denied. Please paste directly into the YouTube URL input.');
      setTimeout(() => setPasteError(null), 4000);
    }
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://youtwitch.app';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      {/* Modal Container */}
      <div 
        className="bg-gray-900 border border-gray-700 w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-red-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Streamer Live Search & Discovery
              </h3>
              <p className="text-xs text-gray-400">
                Find active YouTube live streams & pair with Twitch chat in seconds
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 border-b border-gray-800 bg-gray-900">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search streamer or game (e.g. zeeddota, tarik, ludwig, dota 2 live)..."
              autoFocus
              className="w-full pl-11 pr-24 py-3 bg-gray-800/90 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-xs text-gray-400 hover:text-white bg-gray-700 px-2 py-1 rounded"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Paste Error Toast */}
        {pasteError && (
          <div className="bg-red-950/80 border-b border-red-800 p-2.5 px-4 text-xs text-red-200 flex items-center justify-between">
            <span>{pasteError}</span>
            <button onClick={() => setPasteError(null)} className="text-red-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body / Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* Direct URL Shortcuts Banner */}
          <div className="bg-gradient-to-r from-purple-950/40 via-gray-900 to-red-950/40 border border-purple-800/40 rounded-xl p-3.5 text-xs text-gray-300">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="font-semibold text-purple-200 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  YouTube Live Links Change Daily:
                </div>
                <p className="text-gray-400 leading-relaxed">
                  To get the active live stream, click <strong>"Open Live"</strong> on any streamer below (it opens their direct <code className="text-purple-300">/@handle/live</code> stream on YouTube), then copy the link and click <strong>"Paste & Watch"</strong>!
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
                  <span className="bg-gray-800 px-2.5 py-1 rounded border border-gray-700 text-purple-300">
                    {currentOrigin}/&lt;youtube_id&gt;/&lt;twitch_channel&gt;
                  </span>
                  <button
                    onClick={() => handleCopyExample(`${currentOrigin}/dQw4w9WgXcQ/shroud`)}
                    className="ml-auto inline-flex items-center gap-1 text-[11px] text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 px-2.5 py-1 rounded transition-colors border border-gray-700"
                  >
                    {copiedUrl ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copiedUrl ? 'Copied Example' : 'Copy Example'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Streamer Search Action if user typed custom name */}
          {searchTerm.trim() && (
            <div className="bg-gray-800/80 border border-purple-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div>
                <span className="text-xs text-gray-400">Search YouTube Live for:</span>
                <div className="text-sm font-bold text-white">"{searchTerm.trim()}"</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={generateYoutubeLiveSearchUrl(searchTerm.trim())}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Search YouTube Live
                </a>
                <button
                  onClick={() => {
                    const customStreamer: PresetStreamer = {
                      name: searchTerm.trim(),
                      twitchChannel: searchTerm.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
                      youtubeChannelName: searchTerm.trim(),
                      youtubeHandle: searchTerm.trim(),
                    };
                    onSelectStreamer(customStreamer);
                  }}
                  className="px-3.5 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Load Chat & Stream
                </button>
              </div>
            </div>
          )}

          {/* Popular Multi-Streamers */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Streamers & Channels ({filteredPresets.length})
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredPresets.map((streamer) => {
                const handle = streamer.youtubeHandle || streamer.youtubeChannelName;
                const liveUrl = generateYoutubeChannelLiveUrl(handle);
                const searchLiveUrl = generateYoutubeLiveSearchUrl(streamer.youtubeChannelName);

                return (
                  <div
                    key={streamer.twitchChannel}
                    className="bg-gray-800/80 border border-gray-700/70 hover:border-purple-500/50 rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:shadow-purple-950/30 group"
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div
                          className={`w-9 h-9 rounded-lg bg-gradient-to-tr ${streamer.color || 'from-purple-600 to-red-600'} flex items-center justify-center font-bold text-xs text-white shadow-md shrink-0`}
                        >
                          {streamer.avatarText || streamer.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                            {streamer.name}
                          </div>
                          <div className="text-[11px] text-gray-400 truncate flex items-center gap-2">
                            <span>Twitch: <span className="text-purple-300">@{streamer.twitchChannel}</span></span>
                            <span>YT: <span className="text-red-300">@{handle}</span></span>
                          </div>
                        </div>
                      </div>

                      {streamer.description && (
                        <p className="text-[11px] text-gray-400 line-clamp-1 mb-3">
                          {streamer.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-gray-700/60 mt-1">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1.5 px-2 text-[11px] font-semibold bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-lg text-center flex items-center justify-center gap-1 transition-colors"
                          title={`Open ${handle} Live stream page on YouTube`}
                        >
                          <Radio className="w-3 h-3 text-red-400 animate-pulse" />
                          Open Live Stream
                        </a>
                        <a
                          href={searchLiveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1.5 px-2 text-[11px] text-gray-400 hover:text-white bg-gray-700/60 hover:bg-gray-700 rounded-lg text-center flex items-center justify-center gap-1 transition-colors"
                          title="Search YouTube Live"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handlePasteAndLoadStreamer(streamer)}
                          className="flex-1 py-1 px-2 text-[11px] font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg flex items-center justify-center gap-1 transition-colors"
                          title="Paste copied YouTube link from clipboard and launch"
                        >
                          <Clipboard className="w-3 h-3 text-purple-400" />
                          Paste & Watch
                        </button>
                        <button
                          onClick={() => onSelectStreamer(streamer)}
                          className="py-1 px-2.5 text-[11px] font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center justify-center gap-1 transition-colors shadow-sm"
                          title="Select streamer & set chat"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Select
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent History / Favorites */}
          {filteredHistory.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  Recent & Favorite Streams ({filteredHistory.length})
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredHistory.map((item) => {
                  const isCurrent =
                    item.youtubeId === currentYtId && item.twitchChannel.toLowerCase() === currentTwitchChannel?.toLowerCase();
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectHistory(item)}
                      className={`group p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isCurrent
                          ? 'bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-900/20'
                          : 'bg-gray-800/70 border-gray-700/60 hover:bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-white truncate">
                          <span className="text-purple-400 font-mono">twitch/{item.twitchChannel}</span>
                          <span className="text-gray-500">+</span>
                          <span className="text-red-400 font-mono truncate">yt/{item.youtubeId}</span>
                        </div>
                        <div className="text-[11px] text-gray-400 truncate mt-0.5">
                          {item.name ? item.name : `Stream from ${new Date(item.timestamp).toLocaleDateString()}`}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => onToggleFavorite(item.id, e)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            item.isFavorite
                              ? 'text-amber-400 hover:bg-amber-400/20'
                              : 'text-gray-500 hover:text-amber-300 hover:bg-gray-700'
                          }`}
                          title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star className={`w-4 h-4 ${item.isFavorite ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => onDeleteHistory(item.id, e)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete from history"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-gray-800 bg-gray-950/80 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span>Tip: Press <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-300 font-mono text-[10px]">Esc</kbd> to close</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-xs font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
