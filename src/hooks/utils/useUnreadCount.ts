import { useMemo } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';

export const useUnreadCount = (): number => {
  const user = useAuthStore(state => state.user);
  const conversations = useChatStore(state => state.conversations);
  const memberSettings = useChatStore(state => state.memberSettings);

  return useMemo(() => {
    if (!user) return 0;
    let total = 0;
    conversations.forEach(conv => {
      const ms = memberSettings[conv.id];
      if (!ms || ms.isArchived) return;
      const count = ms.unreadCount || 0;
      total += count > 0 || ms.markedUnread ? (count || 1) : 0;
    });
    return total;
  }, [user, conversations, memberSettings]);
};
