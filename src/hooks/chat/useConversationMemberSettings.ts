import { useEffect, useState } from 'react';
import { ConversationMember } from '../../types';
import { conversationService } from '../../services/chat/conversationService';

export const useConversationMemberSettings = (conversationId: string, userId: string): ConversationMember | null => {
    const [memberSettings, setMemberSettings] = useState<ConversationMember | null>(null);

    useEffect(() => {
        if (!conversationId || !userId) return;

        const unsubscribe = conversationService.subscribeMemberSettings(
            conversationId,
            userId,
            (member) => {
                setMemberSettings(member);
            }
        );

        return unsubscribe;
    }, [conversationId, userId]);

    return memberSettings;
};
