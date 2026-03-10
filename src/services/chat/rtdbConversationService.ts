import { ref, set, get, update, onValue, push, query, orderByChild, equalTo, serverTimestamp, remove } from 'firebase/database';
import { rtdb } from '../../firebase/config';
import { RtdbConversation, RtdbUserChat } from '../../types';

export const rtdbConversationService = {
    /**
     * Tạo hoặc lấy conversation 1-1 giữa 2 user
     */
    getOrCreateDirect: async (user1Id: string, user2Id: string): Promise<string> => {
        try {
            // Check if conversation already exists
            const conversationsRef = ref(rtdb, 'conversations');
            const snapshot = await get(conversationsRef);

            if (snapshot.exists()) {
                const conversations = snapshot.val();

                // Find existing direct conversation between these two users
                for (const [convId, conv] of Object.entries(conversations)) {
                    const conversation = conv as RtdbConversation;
                    if (!conversation.isGroup) {
                        const memberIds = Object.keys(conversation.members || {});
                        if (
                            memberIds.length === 2 &&
                            memberIds.includes(user1Id) &&
                            memberIds.includes(user2Id)
                        ) {
                            // Restore user chat if deleted
                            const userChatRef = ref(rtdb, `user_chats/${user1Id}/${convId}`);
                            const userChatSnap = await get(userChatRef);

                            if (!userChatSnap.exists()) {
                                await set(userChatRef, {
                                    isPinned: false,
                                    isMuted: false,
                                    isArchived: false,
                                    unreadCount: 0,
                                    lastReadMsgId: null,
                                    lastMsgTimestamp: Date.now()
                                });
                            }

                            return convId;
                        }
                    }
                }
            }

            // Create new conversation
            const newConvRef = push(ref(rtdb, 'conversations'));
            const convId = newConvRef.key!;

            const conversationData: RtdbConversation = {
                isGroup: false,
                name: null,
                avatar: null,
                creatorId: user1Id,
                members: {
                    [user1Id]: 'member',
                    [user2Id]: 'member'
                },
                lastMessage: null,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            await set(newConvRef, conversationData);

            // Create user_chats entries for both users
            const updates: Record<string, RtdbUserChat> = {};
            updates[`user_chats/${user1Id}/${convId}`] = {
                isPinned: false,
                isMuted: false,
                isArchived: false,
                unreadCount: 0,
                lastReadMsgId: null,
                lastMsgTimestamp: Date.now()
            };
            updates[`user_chats/${user2Id}/${convId}`] = {
                isPinned: false,
                isMuted: false,
                isArchived: false,
                unreadCount: 0,
                lastReadMsgId: null,
                lastMsgTimestamp: Date.now()
            };

            await update(ref(rtdb), updates);

            return convId;
        } catch (error) {
            console.error('[rtdbConversationService] Lỗi getOrCreateDirect:', error);
            throw error;
        }
    },

    /**
     * Subscribe to user's conversations
     */
    subscribeToUserConversations: (
        userId: string,
        callback: (conversations: Array<{ id: string; data: RtdbConversation; userChat: RtdbUserChat }>) => void
    ) => {
        const userChatsRef = ref(rtdb, `user_chats/${userId}`);

        return onValue(userChatsRef, async (snapshot) => {
            if (!snapshot.exists()) {
                callback([]);
                return;
            }

            const userChats = snapshot.val() as Record<string, RtdbUserChat>;
            const convIds = Object.keys(userChats);

            if (convIds.length === 0) {
                callback([]);
                return;
            }

            // Fetch all conversations metadata
            const conversations: Array<{ id: string; data: RtdbConversation; userChat: RtdbUserChat }> = [];

            for (const convId of convIds) {
                const convRef = ref(rtdb, `conversations/${convId}`);
                const convSnap = await get(convRef);

                if (convSnap.exists()) {
                    conversations.push({
                        id: convId,
                        data: convSnap.val() as RtdbConversation,
                        userChat: userChats[convId]
                    });
                }
            }

            // Sort by lastMsgTimestamp descending
            conversations.sort((a, b) => (b.userChat.lastMsgTimestamp || 0) - (a.userChat.lastMsgTimestamp || 0));

            callback(conversations);
        }, (error) => {
            console.error('[rtdbConversationService] Lỗi subscribe:', error);
        });
    },

    /**
     * Update conversation metadata (name, avatar)
     */
    updateConversationMeta: async (convId: string, updates: Partial<Pick<RtdbConversation, 'name' | 'avatar'>>): Promise<void> => {
        try {
            const convRef = ref(rtdb, `conversations/${convId}`);
            await update(convRef, {
                ...updates,
                updatedAt: Date.now()
            });
        } catch (error) {
            console.error('[rtdbConversationService] Lỗi updateConversationMeta:', error);
            throw error;
        }
    },

    /**
     * Toggle pin conversation
     */
    togglePin: async (uid: string, convId: string, isPinned: boolean): Promise<void> => {
        try {
            const userChatRef = ref(rtdb, `user_chats/${uid}/${convId}`);
            await update(userChatRef, { isPinned });
        } catch (error) {
            console.error('[rtdbConversationService] Lỗi togglePin:', error);
            throw error;
        }
    },

    /**
     * Toggle mute conversation
     */
    toggleMute: async (uid: string, convId: string, isMuted: boolean): Promise<void> => {
        try {
            const userChatRef = ref(rtdb, `user_chats/${uid}/${convId}`);
            await update(userChatRef, { isMuted });
        } catch (error) {
            console.error('[rtdbConversationService] Lỗi toggleMute:', error);
            throw error;
        }
    },

    /**
     * Toggle archive conversation
     */
    toggleArchive: async (uid: string, convId: string, isArchived: boolean): Promise<void> => {
        try {
            const userChatRef = ref(rtdb, `user_chats/${uid}/${convId}`);
            await update(userChatRef, { isArchived });
        } catch (error) {
            console.error('[rtdbConversationService] Lỗi toggleArchive:', error);
            throw error;
        }
    },

    /**
     * Delete conversation for user (remove from user_chats)
     */
    deleteConversation: async (uid: string, convId: string): Promise<void> => {
        try {
            const userChatRef = ref(rtdb, `user_chats/${uid}/${convId}`);
            await remove(userChatRef);
        } catch (error) {
            console.error('[rtdbConversationService] Lỗi deleteConversation:', error);
            throw error;
        }
    },

    /**
     * Reset unread count
     */
    resetUnreadCount: async (uid: string, convId: string, lastReadMsgId?: string): Promise<void> => {
        try {
            const userChatRef = ref(rtdb, `user_chats/${uid}/${convId}`);
            const updates: Partial<RtdbUserChat> = {
                unreadCount: 0
            };

            if (lastReadMsgId) {
                updates.lastReadMsgId = lastReadMsgId;
            }

            await update(userChatRef, updates);
        } catch (error) {
            console.error('[rtdbConversationService] Lỗi resetUnreadCount:', error);
            throw error;
        }
    },

    /**
     * Mark all conversations as read
     */
    markAllAsRead: async (uid: string): Promise<void> => {
        try {
            const userChatsRef = ref(rtdb, `user_chats/${uid}`);
            const snapshot = await get(userChatsRef);

            if (!snapshot.exists()) return;

            const userChats = snapshot.val() as Record<string, RtdbUserChat>;
            const updates: Record<string, number> = {};

            for (const convId of Object.keys(userChats)) {
                if (userChats[convId].unreadCount > 0) {
                    updates[`user_chats/${uid}/${convId}/unreadCount`] = 0;
                }
            }

            if (Object.keys(updates).length > 0) {
                await update(ref(rtdb), updates);
            }
        } catch (error) {
            console.error('[rtdbConversationService] Lỗi markAllAsRead:', error);
            throw error;
        }
    }
};
