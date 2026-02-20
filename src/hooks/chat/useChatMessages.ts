import { useCallback } from 'react';
import { Message } from '../../types';
import { useChatStore } from '../../store/chatStore';

interface UseChatMessagesProps {
  selectedConversationId: string | null;
  currentUserId: string | null;
}

// Xử lý gửi và quản lý tin nhắn
export const useChatMessages = ({ 
  selectedConversationId, 
  currentUserId 
}: UseChatMessagesProps) => {
  const {
    sendTextMessage,
    sendImageMessage,
    sendFileMessage,
    sendVideoMessage,
    sendVoiceMessage,
    sendCallMessage,
    recallMessage,
    deleteMessageForMe,
    editMessage,
    forwardMessage: storeForwardMessage,
    replyToMessage: storeReplyToMessage,
  } = useChatStore();

  const handleSendText = useCallback(async (
    text: string, 
    mentions?: string[], 
    replyToId?: string
  ) => {
    if (!selectedConversationId || !currentUserId) return;
    
    if (replyToId) {
      await storeReplyToMessage(selectedConversationId, currentUserId, text, replyToId);
    } else {
      await sendTextMessage(selectedConversationId, currentUserId, text, mentions);
    }
  }, [selectedConversationId, currentUserId, sendTextMessage, storeReplyToMessage]);

  const handleSendImage = useCallback(async (file: File, replyToId?: string) => {
    if (!selectedConversationId || !currentUserId) return;
    await sendImageMessage(selectedConversationId, currentUserId, file, replyToId);
  }, [selectedConversationId, currentUserId, sendImageMessage]);

  const handleSendFile = useCallback(async (file: File, replyToId?: string) => {
    if (!selectedConversationId || !currentUserId) return;
    await sendFileMessage(selectedConversationId, currentUserId, file, replyToId);
  }, [selectedConversationId, currentUserId, sendFileMessage]);

  const handleSendVideo = useCallback(async (file: File, replyToId?: string) => {
    if (!selectedConversationId || !currentUserId) return;
    await sendVideoMessage(selectedConversationId, currentUserId, file, replyToId);
  }, [selectedConversationId, currentUserId, sendVideoMessage]);

  const handleSendVoice = useCallback(async (file: File, replyToId?: string) => {
    if (!selectedConversationId || !currentUserId) return;
    await sendVoiceMessage(selectedConversationId, currentUserId, file, replyToId);
  }, [selectedConversationId, currentUserId, sendVoiceMessage]);

  const handleEditMessage = useCallback(async (messageId: string, text: string) => {
    await editMessage(messageId, text);
  }, [editMessage]);

  const handleRecallMessage = useCallback(async (messageId: string) => {
    if (!selectedConversationId) return;
    await recallMessage(messageId, selectedConversationId);
  }, [selectedConversationId, recallMessage]);

  const handleDeleteForMe = useCallback(async (messageId: string) => {
    if (!currentUserId) return;
    await deleteMessageForMe(messageId, currentUserId);
  }, [currentUserId, deleteMessageForMe]);

  const forwardMessage = useCallback(async (conversationId: string, message: Message) => {
    if (!currentUserId) return;
    await storeForwardMessage(conversationId, currentUserId, message);
  }, [currentUserId, storeForwardMessage]);

  const replyToMessage = useCallback(async (text: string, replyToId: string) => {
    if (!selectedConversationId || !currentUserId) return;
    await storeReplyToMessage(selectedConversationId, currentUserId, text, replyToId);
  }, [selectedConversationId, currentUserId, storeReplyToMessage]);

  const handleSendCall = useCallback(async (
    callType: 'voice' | 'video',
    status: 'ended' | 'missed' | 'rejected',
    duration?: number
  ) => {
    if (!selectedConversationId || !currentUserId) return;
    await sendCallMessage(selectedConversationId, currentUserId, callType, status, duration);
  }, [selectedConversationId, currentUserId, sendCallMessage]);

  return {
    handleSendText,
    handleSendImage,
    handleSendFile,
    handleSendVideo,
    handleSendVoice,
    handleSendCall,
    handleEditMessage,
    handleRecallMessage,
    handleDeleteForMe,
    forwardMessage,
    replyToMessage,
  };
};
