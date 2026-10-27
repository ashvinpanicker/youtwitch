import React, { useId } from 'react';
import { Clipboard, ExternalLink, Loader2, Play } from 'lucide-react';
import { extractYoutubeId, extractYoutubeChannelId, extractYoutubeHandle, extractTwitchChannel, generateYoutubeChannelLiveUrl } from '../utils/urlParser';

interface SourceFormProps {
  youtubeUrl: string;
  twitchUrl: string;
  onYoutubeUrlChange: (value: string) => void;
  onTwitchUrlChange: (value: string) => void;
  onSubmit: () => void;
  onPasteYoutube: () => void;
  isResolving: boolean;
}

const inputClass =
  'w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-base sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-colors';

export const SourceForm: React.FC<SourceFormProps> = ({
  youtubeUrl,
  twitchUrl,
  onYoutubeUrlChange,
  onTwitchUrlChange,
  onSubmit,
  onPasteYoutube,
  isResolving,
}) => {
  const ids = useId();
  const channelId = extractYoutubeChannelId(youtubeUrl);
  const directVideoId = channelId ? null : extractYoutubeId(youtubeUrl);
  const handle = !directVideoId && !channelId
    ? extractYoutubeHandle(youtubeUrl) || (youtubeUrl.trim().startsWith('@') ? youtubeUrl.trim().substring(1) : null)
    : null;
  const twitchChannel = extractTwitchChannel(twitchUrl);
  const twitchInvalid = twitchUrl.trim() !== '' && !twitchChannel;
  const canSubmit = youtubeUrl.trim().length >= 2 && !!twitchChannel && !isResolving;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
      className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-start"
    >
      <div>
        <label htmlFor={`${ids}-yt`} className="flex items-center gap-1.5 text-xs font-medium text-gray-300 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" aria-hidden="true" />
          YouTube stream
        </label>
        <div className="relative">
          <input
            id={`${ids}-yt`}
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={youtubeUrl}
            onChange={(e) => onYoutubeUrlChange(e.target.value)}
            placeholder="Link, video ID or @channel"
            aria-describedby={`${ids}-yt-hint`}
            className={`${inputClass} pr-10`}
          />
          <button
            type="button"
            onClick={onPasteYoutube}
            aria-label="Paste YouTube link from clipboard"
            title="Paste from clipboard"
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Clipboard className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <p id={`${ids}-yt-hint`} className="mt-1 text-xs text-gray-400 min-h-[1rem]">
          {channelId ? (
            'Channel live stream'
          ) : directVideoId ? (
            'Video found'
          ) : handle ? (
            <>
              Channel @{handle} ·{' '}
              <a
                href={generateYoutubeChannelLiveUrl(handle)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-purple-300 hover:text-purple-200 underline underline-offset-2"
              >
                open live page<ExternalLink className="w-3 h-3" aria-hidden="true" />
                <span className="sr-only"> (new tab)</span>
              </a>{' '}
              and paste the link if it doesn’t load
            </>
          ) : null}
        </p>
      </div>

      <div>
        <label htmlFor={`${ids}-tw`} className="flex items-center gap-1.5 text-xs font-medium text-gray-300 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" aria-hidden="true" />
          Twitch chat
        </label>
        <input
          id={`${ids}-tw`}
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={twitchUrl}
          onChange={(e) => onTwitchUrlChange(e.target.value)}
          placeholder="Channel name or link"
          aria-invalid={twitchInvalid}
          aria-describedby={`${ids}-tw-hint`}
          className={`${inputClass} ${twitchInvalid ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
        />
        <p id={`${ids}-tw-hint`} className={`mt-1 text-xs min-h-[1rem] ${twitchInvalid ? 'text-red-300' : 'text-gray-400'}`}>
          {twitchInvalid ? 'Enter a valid Twitch channel' : twitchChannel ? `twitch.tv/${twitchChannel}` : ''}
        </p>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="sm:mt-5 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isResolving ? (
          <>
            <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" />
            Finding…
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-current" aria-hidden="true" />
            Watch
          </>
        )}
      </button>
    </form>
  );
};
