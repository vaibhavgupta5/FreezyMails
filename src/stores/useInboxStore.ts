import { create } from 'zustand'

export interface Reply {
  id: string;
  campaignId: string;
  recipientId: string;
  messageId: string;
  subject: string;
  fromEmail: string;
  body: string;
  receivedAt: string;
  isRead: boolean;
  repliedAt: string | null;
  campaign: {
    name: string;
  };
  recipient: {
    email: string;
    dynamicData: Record<string, unknown>;
  };
}

interface InboxState {
  replies: Reply[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  hasFetched: boolean;
  fetchReplies: () => Promise<void>;
  markAsRead: (id: string) => void;
  updateReply: (id: string, data: Partial<Reply>) => void;
  forceRefresh: () => Promise<void>;
}

export const useInboxStore = create<InboxState>((set, get) => ({
  replies: [],
  unreadCount: 0,
  loading: false,
  error: null,
  hasFetched: false,

  fetchReplies: async () => {
    // If already fetched, don't refetch immediately unless forced (we can add force flag later if needed)
    if (get().hasFetched) return;
    
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/replies');
      if (!res.ok) throw new Error('Failed to fetch replies');
      const data = await res.json();
      const replies = data.replies || [];
      const unreadCount = replies.filter((r: Reply) => !r.isRead).length;
      
      set({ replies, unreadCount, loading: false, hasFetched: true });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Unknown error', loading: false });
    }
  },

  markAsRead: (id: string) => {
    set((state) => {
      const newReplies = state.replies.map(r => 
        r.id === id && !r.isRead ? { ...r, isRead: true } : r
      );
      const unreadCount = newReplies.filter((r: Reply) => !r.isRead).length;
      return { replies: newReplies, unreadCount };
    });
  },

  updateReply: (id: string, data: Partial<Reply>) => {
    set((state) => {
      const newReplies = state.replies.map(r => 
        r.id === id ? { ...r, ...data } : r
      );
      return { replies: newReplies };
    });
  },

  forceRefresh: async () => {
    set({ hasFetched: false });
    await get().fetchReplies();
  }
}));
