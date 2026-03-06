import { useCallback } from 'react';
import { useChatStore } from '../../store/chatStore';

interface UseChatActionsProps {
  selectedConversationId: string | null;
  currentUserId: string | null;
  selectConversation: (id: string | null) => void;
}

// Các actions cho conversation: pin, mute, archive, mark unread
export const useChatActions = ({ 
  selectedConversationId, 
  currentUserId,
  selectConversation 
}: UseChatActionsProps) => {
  const {
    togglePin,
    toggleMute,
    toggleArchive,
    toggleMarkUnread,
    deleteConversation,
    markAllAsRead,
  } = useChatStore();

  const handlePin = useCallback(async (id: string, pinned: boolean) => {
    await togglePin(id, pinned);
  }, [togglePin]);

  const handleMute = useCallback(async (id: string, muted: boolean) => {
    await toggleMute(id, muted);
  }, [toggleMute]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteConversation(id);
    if (selectedConversationId === id) {
      selectConversation(null);
    }
  }, [deleteConversation, selectedConversationId, selectConversation]);

  const handleArchive = useCallback(async (id: string, archived: boolean) => {
    if (!currentUserId) return;
    await toggleArchive(id, currentUserId, archived);
    if (archived && selectedConversationId === id) {
      selectConversation(null);
    }
  }, [toggleArchive, currentUserId, selectedConversationId, selectConversation]);

  const handleMarkUnread = useCallback(async (id: string, markedUnread: boolean) => {
    await toggleMarkUnread(id, markedUnread);
  }, [toggleMarkUnread]);

  const handleMarkAllRead = useCallback(async () => {
    if (currentUserId) await markAllAsRead(currentUserId);
  }, [currentUserId, markAllAsRead]);

  return {
    handlePin,
    handleMute,
    handleDelete,
    handleArchive,
    handleMarkUnread,
    handleMarkAllRead,
  };
};
