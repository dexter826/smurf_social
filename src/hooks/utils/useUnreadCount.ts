import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useState, useEffect } from 'react';
import { conversationService } from '../../services/chat/conversationService';

export const useUnreadCount = () => {
  const user = useAuthStore(state => state.user);
  const conversations = useChatStore(state => state.conversations);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    // Subscribe to all member settings for unread count
    const unsubscribes: (() => void)[] = [];
    const memberSettingsMap = new Map<string, { unreadCount: number; markedUnread: boolean; isArchived: boolean }>();

    const updateTotalCount = () => {
      let total = 0;
      memberSettingsMap.forEach((settings) => {
        if (settings.isArchived) return;
        const count = settings.unreadCount || 0;
        total += count > 0 || settings.markedUnread ? (count || 1) : 0;
      });
      setUnreadCount(total);
    };

    conversations.forEach(conv => {
      const unsubscribe = conversationService.subscribeMemberSettings(
        conv.id,
        user.id,
        (member) => {
          if (member) {
            memberSettingsMap.set(conv.id, {
              unreadCount: member.unreadCount || 0,
              markedUnread: member.markedUnread || false,
              isArchived: member.isArchived || false
            });
          } else {
            memberSettingsMap.delete(conv.id);
          }
          updateTotalCount();
        }
      );
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user, conversations]);

  return unreadCount;
};
