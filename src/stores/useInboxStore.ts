import { create } from 'zustand'

export interface Reply {
  id: string;
  type?: 'REPLY' | 'SENT';
  campaignId: string;
  recipientId: string;
  messageId: string;
  subject: string;
  fromEmail: string;
  body: string;
  receivedAt: string;
  isRead: boolean;
  isFlagged?: boolean;
  classification?: 'INTERESTED' | 'NOT_INTERESTED' | 'OUT_OF_OFFICE' | 'SPAM' | 'OTHER';
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
  searchQuery: string;
  filterType: 'ALL' | 'UNREAD' | 'SENT' | 'RECEIVED' | 'INTERESTED' | 'NOT_INTERESTED' | 'OUT_OF_OFFICE' | 'SPAM' | 'OTHER';
  setSearchQuery: (query: string) => void;
  setFilterType: (filter: 'ALL' | 'UNREAD' | 'SENT' | 'RECEIVED' | 'INTERESTED' | 'NOT_INTERESTED' | 'OUT_OF_OFFICE' | 'SPAM' | 'OTHER') => void;
  fetchReplies: () => Promise<void>;
  markAsRead: (id: string) => void;
  updateReply: (id: string, data: Partial<Reply>) => void;
  toggleFlag: (id: string) => void;
  forceRefresh: () => Promise<void>;
}

export const useInboxStore = create<InboxState>((set, get) => ({
  replies: [],
  unreadCount: 0,
  loading: false,
  error: null,
  hasFetched: false,
  searchQuery: '',
  filterType: 'ALL',

  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterType: (filter) => set({ filterType: filter }),

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

  toggleFlag: (id: string) => {
    const r = get().replies.find(x => x.id === id);
    if (!r) return;
    const newFlag = !r.isFlagged;
    
    // Optimistic update
    set((state) => ({
      replies: state.replies.map(reply => 
        reply.id === id ? { ...reply, isFlagged: newFlag } : reply
      )
    }));

    // Async backend call
    fetch(`/api/replies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFlagged: newFlag })
    }).catch(err => console.error('Failed to toggle flag:', err));
  },

  forceRefresh: async () => {
    set({ loading: true, error: null });
    try {
      // 1. Tell backend to manually trigger IMAP check for user's accounts
      await fetch('/api/replies/sync', { method: 'POST' });
    } catch (err) {
      console.error('Failed to sync IMAP', err);
    }
    
    // 2. Refetch from database
    set({ hasFetched: false });
    await get().fetchReplies();
  }
}));
