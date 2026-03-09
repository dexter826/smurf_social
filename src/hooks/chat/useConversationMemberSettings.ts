import { useChatStore } from '../../store/chatStore';
import { ConversationMember } from '../../types';

export const useConversationMemberSettings = (conversationId: string, _userId: string): ConversationMember | null => {
    return useChatStore(state => state.memberSettings[conversationId] ?? null);
};
