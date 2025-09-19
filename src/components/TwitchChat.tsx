import React, { useState, useEffect, useRef } from 'react';
import tmi from 'tmi.js';
import { StaticAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { EmoteFetcher, EmoteParser } from '@mkody/twitch-emoticons';

interface TwitchChatProps {
  channel: string;
}

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  color?: string;
}

// TODO: Replace with your actual Twitch API client ID and client secret
const TWITCH_CLIENT_ID = 'YOUR_TWITCH_CLIENT_ID';
const TWITCH_CLIENT_SECRET = 'YOUR_TWITCH_CLIENT_SECRET';

const authProvider = new StaticAuthProvider(TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET);
const apiClient = new ApiClient({ authProvider });

// Initialize EmoteFetcher and EmoteParser outside the component to avoid re-initialization
const emoteFetcher = new EmoteFetcher(apiClient);
const emoteParser = new EmoteParser(emoteFetcher, {
  template: '<img class="inline-block" src="{url}" alt="{code}" />',
});

const TwitchChat: React.FC<TwitchChatProps> = ({ channel }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [globalEmotes, setGlobalEmotes] = useState<any[]>([]);
  const [channelEmotes, setChannelEmotes] = useState<any[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<tmi.Client | null>(null);

  useEffect(() => {
    if (!channel) return;

    const fetchEmotes = async () => {
      try {
        // Fetch global BTTV emotes
        const fetchedGlobalEmotes = await emoteFetcher.fetchBTTVEmotes();
        setGlobalEmotes(Array.from(fetchedGlobalEmotes.values()));
        console.log('Fetched global BTTV emotes:', fetchedGlobalEmotes);

        // Fetch channel-specific BTTV emotes
        const twitchUser = await apiClient.users.getUserByName(channel);
        if (twitchUser) {
          const fetchedChannelEmotes = await emoteFetcher.fetchBTTVEmotes(Number(twitchUser.id)); // Convert to number
          setChannelEmotes(Array.from(fetchedChannelEmotes.values()));
          console.log(`Fetched BTTV emotes for channel ${channel}:`, fetchedChannelEmotes);
        } else {
          console.warn(`Could not find Twitch user for channel: ${channel}`);
        }

        // Add emotes to the parser

      } catch (error) {
        console.error('Error fetching BTTV emotes:', error);
      }
    };

    fetchEmotes();

    // Disconnect existing client if channel changes
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }

    const client = new tmi.Client({
      channels: [channel]
    });

    clientRef.current = client;

    client.on('message', (ch, tags, message, self) => {
      if (self) return; // Ignore messages from the bot itself

      const user = tags['display-name'] || tags.username || 'unknown';
      const color = tags.color || '#FFFFFF'; // Default to white if no color is provided

      setMessages((prevMessages) => [
        ...prevMessages,
        { id: tags.id || Date.now().toString(), user, message: emoteParser.parse(message), color },
      ]);
    });

    client.on('connected', (addr, port) => {
      console.log(`Connected to Twitch IRC: ${addr}:${port}`);
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: Date.now().toString(), user: 'System', message: `Connected to #${channel} chat.` },
      ]);
    });

    client.on('disconnected', (reason) => {
      console.log(`Disconnected from Twitch IRC: ${reason}`);
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: Date.now().toString(), user: 'System', message: `Disconnected from #${channel} chat: ${reason}` },
      ]);
    });

    client.on('reconnect', () => {
      console.log('Attempting to reconnect to Twitch IRC...');
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: Date.now().toString(), user: 'System', message: 'Attempting to reconnect...' },
      ]);
    });

    client.connect().catch(console.error);

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  }, [channel]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <div className="p-2 border-b border-gray-700 text-center font-bold">
        Twitch Chat: #{channel}
      </div>
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-2 space-y-1 text-sm">
        {messages.map((msg) => (
          <div key={msg.id} className="break-words">
            <span style={{ color: msg.color }} className="font-bold mr-1">
              {msg.user}:
            </span>
            <span dangerouslySetInnerHTML={{ __html: msg.message }} />
          </div>
        ))}
      </div>
      {/* Optional: Add an input for sending messages later */}
      {/* <div className="p-2 border-t border-gray-700">
        <input
          type="text"
          placeholder="Send a message..."
          className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div> */}
    </div>
  );
};

export default TwitchChat;