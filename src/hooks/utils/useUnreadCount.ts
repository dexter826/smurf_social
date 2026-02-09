import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';

export const useUnreadCount = () => {
  const user = useAuthStore(state => state.user);
  const conversations = useChatStore(state => state.conversations);

  return user ? conversations.reduce((total, conv) => {
    const count = conv.unreadCount?.[user.id] || 0;
    return total + (count > 0 || conv.markedUnread ? (count || 1) : 0);
  }, 0) : 0;
};
