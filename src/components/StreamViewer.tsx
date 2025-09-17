import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Maximize, Minimize, ChevronUp, ChevronDown } from 'lucide-react';
import TwitchChat from './TwitchChat';

const StreamViewer: React.FC = () => {
  const [youtubeUrl, setYoutubeUrl] = useState('https://www.youtube.com/watch?v=jfKfPfyJRdk');
  const [twitchUrl, setTwitchUrl] = useState('https://twitch.tv/twitchdev');
  const [activeYoutubeId, setActiveYoutubeId] = useState<string | null>(null);
  const [activeTwitchChannel, setActiveTwitchChannel] = useState<string | null>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [chatWidth, setChatWidth] = useState(320);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [mouseTimer, setMouseTimer] = useState<NodeJS.Timeout | null>(null);
  const [showToggleButton, setShowToggleButton] = useState(false);
  const [toggleButtonTimer, setToggleButtonTimer] = useState<NodeJS.Timeout | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    // const savedYoutubeUrl = localStorage.getItem('streamViewer_youtubeUrl');
    // const savedTwitchUrl = localStorage.getItem('streamViewer_twitchUrl');
    const savedChatWidth = localStorage.getItem('streamViewer_chatWidth');
    const savedYoutubeId = localStorage.getItem('streamViewer_activeYoutubeId');
    const savedTwitchChannel = localStorage.getItem('streamViewer_activeTwitchChannel');

    // Temporarily disable loading from localStorage for testing hardcoded values
    // if (savedYoutubeUrl) setYoutubeUrl(savedYoutubeUrl);
    // if (savedTwitchUrl) setTwitchUrl(savedTwitchUrl);
    if (savedChatWidth) setChatWidth(parseInt(savedChatWidth));
    if (savedYoutubeId) setActiveYoutubeId(savedYoutubeId);
    if (savedTwitchChannel) setActiveTwitchChannel(savedTwitchChannel);
  }, []);

  // Save to localStorage when values change
  // Temporarily disable saving to localStorage for testing hardcoded values
  // useEffect(() => {
  //   localStorage.setItem('streamViewer_youtubeUrl', youtubeUrl);
  // }, [youtubeUrl]);

  // useEffect(() => {
  //   localStorage.setItem('streamViewer_twitchUrl', twitchUrl);
  // }, [twitchUrl]);

  useEffect(() => {
    localStorage.setItem('streamViewer_chatWidth', chatWidth.toString());
  }, [chatWidth]);

  useEffect(() => {
    if (activeYoutubeId) {
      localStorage.setItem('streamViewer_activeYoutubeId', activeYoutubeId);
    }
  }, [activeYoutubeId]);

  useEffect(() => {
    if (activeTwitchChannel) {
      localStorage.setItem('streamViewer_activeTwitchChannel', activeTwitchChannel);
    }
  }, [activeTwitchChannel]);

  useEffect(() => {
    if (youtubeUrl && twitchUrl && !activeYoutubeId && !activeTwitchChannel) {
      initialiseStreamAndChat();
    }
  }, [youtubeUrl, twitchUrl, activeYoutubeId, activeTwitchChannel]);

  const extractYoutubeId = (url: string): string | null => {
    if (!url || !url.trim()) return null;

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
      /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  };

  const extractTwitchChannel = (url: string): string | null => {
    if (!url || !url.trim()) return null;

    const match = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
    return match && match[1] ? match[1] : null;
  };

  const initialiseStreamAndChat = () => {
    console.log('initialiseStreamAndChat called!');
    console.log('Initialising stream and chat with URLs:', { youtubeUrl, twitchUrl });

    const ytId = extractYoutubeId(youtubeUrl);
    const twitchChannel = extractTwitchChannel(twitchUrl);

    console.log('Extracted IDs:', { ytId, twitchChannel });

    if (ytId) {
      setActiveYoutubeId(ytId);
      console.log('Set YouTube ID:', ytId);
    }
    if (twitchChannel) {
      setActiveTwitchChannel(twitchChannel);
      console.log('Set Twitch channel:', twitchChannel);
    }
  };

  const isValidYoutube = youtubeUrl.trim() !== '' && extractYoutubeId(youtubeUrl) !== null;
  const isValidTwitch = twitchUrl.trim() !== '' && extractTwitchChannel(twitchUrl) !== null;
  const canLoadStream = isValidYoutube && isValidTwitch;
  console.log('canLoadStream:', canLoadStream);


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
    if (mouseTimer) {
      clearTimeout(mouseTimer);
    }

    setShowControls(true);

    if (activeYoutubeId && activeTwitchChannel) {
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 5000);
      setMouseTimer(timer);
    }
  }, [mouseTimer, activeYoutubeId, activeTwitchChannel]);

  useEffect(() => {
    if (activeYoutubeId && activeTwitchChannel) {
      document.addEventListener('mousemove', resetMouseTimer);
      document.addEventListener('mousedown', resetMouseTimer);
      document.addEventListener('keydown', resetMouseTimer);

      // Start the timer immediately
      resetMouseTimer();
    } else {
      setShowControls(true);
      if (mouseTimer) {
        clearTimeout(mouseTimer);
        setMouseTimer(null);
      }
    }

    return () => {
      document.removeEventListener('mousemove', resetMouseTimer);
      document.removeEventListener('mousedown', resetMouseTimer);
      document.removeEventListener('keydown', resetMouseTimer);
      if (mouseTimer) {
        clearTimeout(mouseTimer);
      }
    };
  }, [activeYoutubeId, activeTwitchChannel, resetMouseTimer, mouseTimer]);

  // Mouse activity tracking for toggle button auto-hide
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (event.clientY < 100) { // If mouse is within 100px of the top
        setShowToggleButton(true);
        if (toggleButtonTimer) {
          clearTimeout(toggleButtonTimer);
        }
        const timer = setTimeout(() => {
          setShowToggleButton(false);
        }, 5000);
        setToggleButtonTimer(timer);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (toggleButtonTimer) {
        clearTimeout(toggleButtonTimer);
      }
    };
  }, [toggleButtonTimer]);

  const headerHeight = isHeaderVisible && showControls ? '140px' : '0px';
  const mainHeight = `calc(100vh - ${headerHeight})`;


  return (
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <div className={`bg-gray-800 border-b border-gray-700 transition-all duration-300 overflow-hidden ${
        isHeaderVisible && showControls
          ? 'h-[140px] opacity-100'
          : 'h-0 opacity-0'
      }`}>
        <div className="max-w-7xl mx-auto p-4">
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <img src="/favicon.svg" alt="YouTwitch Logo" className="w-6 h-6 rounded-sm" />
                YouTwitch: YouTube Stream + Twitch Chat
              </h1>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors duration-200"
                  title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? (
                    <Minimize className="w-4 h-4" />
                  ) : (
                    <Maximize className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  YouTube Stream URL
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value);
                    console.log('YouTube URL changed:', e.target.value);
                  }}
                  placeholder="https://youtube.com/watch?v=..."
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    youtubeUrl && !isValidYoutube
                      ? 'border-red-500 focus:ring-red-500'
                      : youtubeUrl && isValidYoutube
                      ? 'border-green-500 focus:ring-green-500'
                      : 'border-gray-600 focus:ring-purple-500'
                  }`}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Twitch Chat URL
                  </label>
                  <input
                    type="url"
                    value={twitchUrl}
                    onChange={(e) => {
                      setTwitchUrl(e.target.value);
                      console.log('Twitch URL changed:', e.target.value);
                    }}
                    placeholder="https://twitch.tv/channel_name"
                    className={`w-full px-3 py-2 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      twitchUrl && !isValidTwitch
                        ? 'border-red-500 focus:ring-red-500'
                        : twitchUrl && isValidTwitch
                        ? 'border-green-500 focus:ring-green-500'
                        : 'border-gray-600 focus:ring-blue-500'
                    }`}
                  />
                </div>
                <button
                  onClick={initialiseStreamAndChat}
                  disabled={!canLoadStream}
                  className="px-6 py-2 mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium
                           hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                           flex items-center gap-2 whitespace-nowrap"
                >
                  <ExternalLink className="w-4 h-4" />
                  Go
                </button>
              </div>
            </div>
          </>
        </div>
      </div>

      {/* Header Toggle Button */}
      {showToggleButton && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={() => setIsHeaderVisible(prev => !prev)}
            className="p-3 bg-gray-800 rounded-full shadow-lg hover:bg-gray-700 transition-colors duration-200"
            title={isHeaderVisible ? 'Hide header' : 'Show header'}
          >
            {isHeaderVisible ? (
              <ChevronUp className="w-6 h-6 text-white" />
            ) : (
              <ChevronDown className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
      )}

      {/* Main Content */}
      {activeYoutubeId && activeTwitchChannel ? (
        <div className="flex relative" style={{ height: mainHeight }}>
          {/* Video Player */}
          <div className="flex-1 bg-background flex items-center justify-center p-4">
            <div className="w-full h-full max-w-none">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${activeYoutubeId}?autoplay=1&mute=0`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="rounded-lg"
              ></iframe>
            </div>
          </div>

          {/* Chat Sidebar */}
          <div
            className={`bg-background border-l border-gray-700 flex flex-col`}
            style={{ width: `${chatWidth}px` }}
          >
            <div className="flex-1">
              <TwitchChat channel={activeTwitchChannel} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8" style={{ height: mainHeight }}>
          <div className="text-center">
            <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mx-auto mb-4">
              <img src="/favicon.svg" alt="YouTwitch Logo" className="w-6 h-6 rounded-sm" />
            </div>
            <h2 className="text-xl font-semibold text-gray-300 mb-2">
              Ready to Stream
            </h2>
            <p className="text-gray-400 max-w-md">
              Enter both a YouTube stream URL and a Twitch channel URL above to get started.
              The video will appear on the left and chat on the right for the perfect theater experience.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamViewer;