import { create } from "zustand";
import { chatApi } from "../services/chatApi";

const useChatStore = create((set, get) => ({
  channels: [],
  activeChannelId: null,
  messages: {},
  typingUsers: {},
  unreadCounts: {},
  loading: false,
  messagesLoading: false,

  fetchChannels: async (projectId) => {
    set({ loading: true });
    try {
      const { data } = await chatApi.getChannels(projectId);
      set({ channels: data.channels || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createChannel: async (payload) => {
    const { data } = await chatApi.createChannel(payload);
    set((s) => ({ channels: [data.channel, ...s.channels] }));
    return data.channel;
  },

  setActiveChannel: (channelId) => {
    set({ activeChannelId: channelId });

    set((s) => ({
      unreadCounts: { ...s.unreadCounts, [channelId]: 0 },
    }));
  },

  fetchMessages: async (channelId, before) => {
    set({ messagesLoading: true });
    try {
      const { data } = await chatApi.getMessages(channelId, { before, limit: 50 });
      set((s) => ({
        messages: {
          ...s.messages,
          [channelId]: before
            ? [...(data.messages || []), ...(s.messages[channelId] || [])]
            : (data.messages || []),
        },
        messagesLoading: false,
      }));
    } catch {
      set({ messagesLoading: false });
    }
  },

  onMessage: (message) => {
    const channelId = message.channel;
    set((s) => {
      const existing = s.messages[channelId] || [];

      const alreadyExists = existing.some((m) => m._id === message._id);
      return {
        messages: {
          ...s.messages,
          [channelId]: alreadyExists ? existing : [...existing, message],
        },

        unreadCounts: channelId !== s.activeChannelId
          ? { ...s.unreadCounts, [channelId]: (s.unreadCounts[channelId] || 0) + 1 }
          : s.unreadCounts,

        channels: s.channels.map((ch) =>
          ch._id === channelId
            ? { ...ch, lastMessage: { content: message.content, sentAt: message.createdAt } }
            : ch
        ),
      };
    });
  },

  onMessageDeleted: (messageId) => {
    set((s) => {
      const updated = {};
      for (const [cid, msgs] of Object.entries(s.messages)) {
        updated[cid] = msgs.map((m) =>
          m._id === messageId ? { ...m, content: "[deleted]", deletedAt: new Date() } : m
        );
      }
      return { messages: updated };
    });
  },

  onMessageEdited: ({ messageId, content, editedAt }) => {
    set((s) => {
      const updated = {};
      for (const [cid, msgs] of Object.entries(s.messages)) {
        updated[cid] = msgs.map((m) => (m._id === messageId ? { ...m, content, editedAt } : m));
      }
      return { messages: updated };
    });
  },

  onReaction: ({ messageId, emoji, userId }) => {
    set((s) => {
      const updated = {};
      for (const [cid, msgs] of Object.entries(s.messages)) {
        updated[cid] = msgs.map((m) => {
          if (m._id !== messageId) return m;
          const reactions = [...(m.reactions || [])];
          const existing = reactions.find((r) => r.emoji === emoji);
          if (existing) {
            const hasUser = existing.users.includes(userId);
            return {
              ...m,
              reactions: hasUser
                ? reactions
                    .map((r) =>
                      r.emoji === emoji ? { ...r, users: r.users.filter((u) => u !== userId) } : r
                    )
                    .filter((r) => r.users.length > 0)
                : reactions.map((r) =>
                    r.emoji === emoji ? { ...r, users: [...r.users, userId] } : r
                  ),
            };
          }
          return { ...m, reactions: [...reactions, { emoji, users: [userId] }] };
        });
      }
      return { messages: updated };
    });
  },

  setTyping: ({ channelId, userId, name, isTyping }) => {
    set((s) => {
      const channelTypers = { ...(s.typingUsers[channelId] || {}) };
      if (isTyping) {
        channelTypers[userId] = { name };
      } else {
        delete channelTypers[userId];
      }
      return { typingUsers: { ...s.typingUsers, [channelId]: channelTypers } };
    });
  },
}));

export default useChatStore;
