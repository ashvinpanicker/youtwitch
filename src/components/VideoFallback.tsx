import React, { useId, useState } from 'react';
import { m } from 'motion/react';
import { Clipboard, ExternalLink, Loader2, Play, RotateCw } from 'lucide-react';
import { extractYoutubeId } from '../utils/urlParser';

interface VideoFallbackProps {
  name: string;
  isResolving: boolean;
  livePageUrl: string;
  /** Returns true when the link was accepted */
  onSubmitLink: (link: string) => boolean;
  onPasteFromClipboard: () => void;
  onRetry?: () => void;
}

/**
 * Shown in place of the player while we look for the live video, or when none was found.
 * Lets people paste the stream link themselves, since YouTube issues a new link for every stream.
 */
export const VideoFallback: React.FC<VideoFallbackProps> = ({
  name,
  isResolving,
  livePageUrl,
  onSubmitLink,
  onPasteFromClipboard,
  onRetry,
}) => {
  const [link, setLink] = useState('');
  const ids = useId();

  if (isResolving) {
    return (
      <div role="status" className="h-full flex items-center justify-center gap-2 p-6 text-sm text-gray-400">
        <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" />
        Finding {name}’s YouTube live…
      </div>
    );
  }

  const submit = (value: string) => {
    if (onSubmitLink(value)) setLink('');
  };

  return (
    <div className="h-full overflow-y-auto flex items-center justify-center p-4 sm:p-6">
      <m.section
        aria-labelledby={`${ids}-title`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-md space-y-4 text-center"
      >
        <div className="space-y-1">
          <h2 id={`${ids}-title`} className="text-base sm:text-lg font-semibold text-white">
            {name} isn’t live on YouTube right now
          </h2>
          <p className="text-sm text-gray-400">
            Chat is still on. If they are streaming, paste the YouTube link to watch it here.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(link);
          }}
          className="flex gap-2"
        >
          <label htmlFor={`${ids}-link`} className="sr-only">
            YouTube stream link
          </label>
          <div className="relative flex-1 min-w-0">
            <input
              id={`${ids}-link`}
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              // Play straight away when a valid link is pasted
              onPaste={(e) => {
                const text = e.clipboardData.getData('text');
                if (extractYoutubeId(text)) {
                  e.preventDefault();
                  submit(text);
                }
              }}
              placeholder="Paste YouTube link"
              className="w-full pl-3 pr-10 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-base sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
            />
            <button
              type="button"
              onClick={onPasteFromClipboard}
              aria-label="Paste from clipboard"
              title="Paste from clipboard"
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Clipboard className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <button
            type="submit"
            disabled={!link.trim()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="w-4 h-4 fill-current" aria-hidden="true" />
            Watch
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
          <a
            href={livePageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            Open on YouTube<span className="sr-only"> (new tab)</span>
          </a>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
              Check again
            </button>
          )}
        </div>
        {onRetry && <p className="text-xs text-gray-400">We’ll keep checking every minute.</p>}
      </m.section>
    </div>
  );
};
