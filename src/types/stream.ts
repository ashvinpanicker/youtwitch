export interface StreamHistoryItem {
  id: string;
  youtubeId: string;
  twitchChannel: string;
  name?: string;
  timestamp: number;
  isFavorite?: boolean;
}

export type StreamerCategory = 'dota' | 'variety';

export interface PresetStreamer {
  name: string;
  twitchChannel: string;
  youtubeChannelName: string;
  youtubeHandle?: string;
  youtubeChannelId?: string;
  avatarText?: string;
  color?: string;
  description?: string;
  category?: StreamerCategory;
  /** Tournament / event channels that are only live during events (e.g. TI) */
  isEvent?: boolean;
}
