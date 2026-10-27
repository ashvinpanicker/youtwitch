import React, { useState } from 'react';

export const CHAT_MIN_WIDTH = 260;
export const CHAT_MAX_WIDTH = 640;
export const CHAT_DEFAULT_WIDTH = 340;

const clamp = (value: number) => Math.min(CHAT_MAX_WIDTH, Math.max(CHAT_MIN_WIDTH, value));

interface ChatResizerProps {
  width: number;
  onChange: (width: number) => void;
}

/**
 * Draggable + keyboard-operable splitter between the video and the chat (ARIA window splitter pattern).
 */
export const ChatResizer: React.FC<ChatResizerProps> = ({ width, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    setIsDragging(true);

    const handleMove = (ev: PointerEvent) => onChange(clamp(startWidth + (startX - ev.clientX)));
    const handleUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 60 : 20;
    if (e.key === 'ArrowLeft') onChange(clamp(width + step));
    else if (e.key === 'ArrowRight') onChange(clamp(width - step));
    else if (e.key === 'Home') onChange(CHAT_MAX_WIDTH);
    else if (e.key === 'End') onChange(CHAT_MIN_WIDTH);
    else return;
    e.preventDefault();
  };

  return (
    <>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize chat"
        aria-valuenow={width}
        aria-valuemin={CHAT_MIN_WIDTH}
        aria-valuemax={CHAT_MAX_WIDTH}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
        onDoubleClick={() => onChange(CHAT_DEFAULT_WIDTH)}
        title="Drag to resize chat · double-click to reset"
        className="hidden md:block relative w-1.5 -mx-[3px] z-10 cursor-col-resize group focus:outline-none"
      >
        <span
          className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-px transition-colors ${
            isDragging ? 'bg-purple-400' : 'bg-white/10 group-hover:bg-purple-400/70 group-focus-visible:bg-purple-400'
          }`}
        />
      </div>
      {/* Iframes swallow pointer events, so cover them while dragging */}
      {isDragging && <div className="fixed inset-0 z-50 cursor-col-resize" aria-hidden="true" />}
    </>
  );
};
