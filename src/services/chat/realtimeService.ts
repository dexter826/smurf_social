import { ref, set, onValue, off, serverTimestamp, onDisconnect } from 'firebase/database';
import { rtdb } from '../../firebase/config';
import { ConversationRealtimeState } from '../../types';

export const realtimeService = {
    /**
     * Set typing status for a user in a conversation
     */
    setTypingStatus: async (conversationId: string, userId: string, isTyping: boolean) => {
        const typingRef = ref(rtdb, `typing/${conversationId}/${userId}`);

        if (isTyping) {
            await set(typingRef, {
                timestamp: serverTimestamp(),
                isTyping: true,
            });

            // Auto-remove after 5 seconds if user disconnects
            onDisconnect(typingRef).remove();
        } else {
            await set(typingRef, null);
        }
    },

    /**
     * Subscribe to typing status changes for a conversation
     */
    subscribeToTyping: (
        conversationId: string,
        callback: (typingUsers: string[]) => void
    ): (() => void) => {
        const typingRef = ref(rtdb, `typing/${conversationId}`);

        const listener = onValue(typingRef, (snapshot) => {
            const data = snapshot.val();

            if (!data) {
                callback([]);
                return;
            }

            const now = Date.now();
            const typingUsers: string[] = [];

            // Filter out stale typing indicators (older than 5 seconds)
            Object.entries(data).forEach(([userId, value]: [string, any]) => {
                if (value?.isTyping && value?.timestamp) {
                    const age = now - value.timestamp;
                    if (age < 5000) {
                        typingUsers.push(userId);
                    }
                }
            });

            callback(typingUsers);
        });

        return () => off(typingRef, 'value', listener);
    },

    /**
     * Clear typing status for a user (on unmount or disconnect)
     */
    clearTypingStatus: async (conversationId: string, userId: string) => {
        const typingRef = ref(rtdb, `typing/${conversationId}/${userId}`);
        await set(typingRef, null);
    },
};
