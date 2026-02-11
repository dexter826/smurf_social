import { create } from 'zustand';
import { ref, onValue, Unsubscribe } from 'firebase/database';
import { rtdb } from '../firebase/config';
import { UserStatus } from '../types';

interface PresenceData {
  status: UserStatus;
  lastSeen?: number;
}

interface PresenceState {
  presenceMap: Record<string, PresenceData>;
  subscriberCounts: Record<string, number>;
  unsubscribes: Record<string, Unsubscribe>;

  subscribe: (userId: string, initialStatus?: UserStatus) => void;
  unsubscribe: (userId: string) => void;
  getPresence: (userId: string) => PresenceData | null;
  reset: () => void;
}

export const usePresenceStore = create<PresenceState>()((set, get) => ({
  presenceMap: {},
  subscriberCounts: {},
  unsubscribes: {},

  subscribe: (userId: string, initialStatus?: UserStatus) => {
    if (!userId) return;
    const { subscriberCounts, unsubscribes, presenceMap } = get();
    const currentCount = subscriberCounts[userId] || 0;

    if (currentCount > 0) {
      set({ subscriberCounts: { ...subscriberCounts, [userId]: currentCount + 1 } });
      return;
    }

    if (initialStatus && !presenceMap[userId]) {
      set({ presenceMap: { ...presenceMap, [userId]: { status: initialStatus } } });
    }

    const statusRef = ref(rtdb, `/status/${userId}`);
    const unsub = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as PresenceData;
        set(state => ({
          presenceMap: { ...state.presenceMap, [userId]: data }
        }));
      }
    });

    set({
      subscriberCounts: { ...subscriberCounts, [userId]: 1 },
      unsubscribes: { ...unsubscribes, [userId]: unsub }
    });
  },

  unsubscribe: (userId: string) => {
    if (!userId) return;
    const { subscriberCounts, unsubscribes } = get();
    const currentCount = subscriberCounts[userId] || 0;

    if (currentCount <= 1) {
      unsubscribes[userId]?.();
      const { [userId]: _unsub, ...restUnsubs } = unsubscribes;
      const { [userId]: _count, ...restCounts } = subscriberCounts;
      set({ subscriberCounts: restCounts, unsubscribes: restUnsubs });
    } else {
      set({ subscriberCounts: { ...subscriberCounts, [userId]: currentCount - 1 } });
    }
  },

  getPresence: (userId: string) => {
    return get().presenceMap[userId] || null;
  },

  reset: () => {
    const { unsubscribes } = get();
    Object.values(unsubscribes).forEach(unsub => unsub());
    set({ presenceMap: {}, subscriberCounts: {}, unsubscribes: {} });
  }
}));
