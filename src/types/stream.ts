export interface StreamHistoryItem {
  id: string;
  youtubeId: string;
  twitchChannel: string;
  name?: string;
  timestamp: number;
  isFavorite?: boolean;
}

export interface PresetStreamer {
  name: string;
  twitchChannel: string;
  youtubeChannelName: string;
  youtubeHandle?: string;
  youtubeChannelId?: string;
  avatarText?: string;
  color?: string;
  description?: string;
}
