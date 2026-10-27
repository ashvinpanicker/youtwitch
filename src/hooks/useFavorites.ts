import { useCallback, useState } from 'react';
import { DEFAULT_FAVORITE_CHANNELS } from '../utils/presets';

const FAVORITES_STORAGE_KEY = 'youtwitch_favorite_channels';

const loadFavorites = (): string[] => {
  try {
    const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore unreadable storage
  }
  return DEFAULT_FAVORITE_CHANNELS;
};

/**
 * Favourite streamers, keyed by Twitch channel (lowercase)
 */
export const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);

  const toggleFavorite = useCallback((channel: string) => {
    const key = channel.toLowerCase();
    setFavorites((prev) => {
      const updated = prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key];
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore unavailable storage
      }
      return updated;
    });
  }, []);

  const isFavorite = useCallback((channel: string) => favorites.includes(channel.toLowerCase()), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
};
