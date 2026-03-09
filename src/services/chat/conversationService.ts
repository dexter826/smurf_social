import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  Timestamp,
  limit,
  setDoc,
  deleteDoc,
  increment
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Conversation, ConversationMember } from '../../types';

export const conversationService = {
  getOrCreateConversation: async (user1Id: string, user2Id: string): Promise<string> => {
    try {
      const [sec1Snap, sec2Snap] = await Promise.all([
        getDoc(doc(db, 'users', user1Id, 'private', 'security')),
        getDoc(doc(db, 'users', user2Id, 'private', 'security')),
      ]);
      if (sec1Snap.data()?.blockedUserIds?.includes(user2Id)) {
        throw new Error('Bạn đã chặn người dùng này');
      }
      if (sec2Snap.data()?.blockedUserIds?.includes(user1Id)) {
        throw new Error('Không thể nhắn tin cho người dùng này');
      }

      const participantIds = [user1Id, user2Id].sort();

      const q = query(
        collection(db, 'conversations'),
        where('participantIds', '==', participantIds),
        where('isGroup', '==', false)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const convId = querySnapshot.docs[0].id;

        // Check if user1 deleted this conversation
        const memberRef = doc(db, 'conversations', convId, 'members', user1Id);
        const memberSnap = await getDoc(memberRef);

        if (memberSnap.exists() && memberSnap.data().deletedAt) {
          // Restore conversation: remove deletedAt
          await updateDoc(memberRef, {
            deletedAt: null,
            joinedAt: serverTimestamp()
          });
        }

        return convId;
      }

      // Create new conversation
      const conversationData = {
        participantIds,
        isGroup: false,
        creatorId: user1Id,
        adminIds: [],
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'conversations'), conversationData);

      // Create member documents for both users
      const batch = writeBatch(db);
      const now = serverTimestamp();

      participantIds.forEach(userId => {
        const memberRef = doc(db, 'conversations', docRef.id, 'members', userId);
        batch.set(memberRef, {
          userId,
          joinedAt: now,
          isPinned: false,
          isMuted: false,
          isArchived: false,
          markedUnread: false,
          unreadCount: 0
        });
      });

      await batch.commit();

      return docRef.id;
    } catch (error) {
      console.error("Lỗi tạo hội thoại:", error);
      throw error;
    }
  },

  subscribeToConversations: (userId: string, callback: (conversations: Conversation[]) => void) => {
    const q = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', userId),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );

    return onSnapshot(q, async (snapshot) => {
      const conversations = snapshot.docs.map((d) => {
        const data = d.data();

        return {
          ...data,
          id: d.id,
          updatedAt: data.updatedAt as Timestamp,
          createdAt: data.createdAt as Timestamp,
          lastMessage: data.lastMessage ? {
            ...data.lastMessage,
            createdAt: data.lastMessage.createdAt as Timestamp
          } : undefined
        } as Conversation;
      }).filter(c => c !== null) as Conversation[];

      callback(conversations);
    }, (error) => {
      console.error("Lỗi đăng ký danh sách hội thoại:", error);
    });
  },

  getMemberSettings: async (conversationId: string, userId: string): Promise<ConversationMember | null> => {
    try {
      const memberRef = doc(db, 'conversations', conversationId, 'members', userId);
      const memberSnap = await getDoc(memberRef);

      if (!memberSnap.exists()) return null;

      const data = memberSnap.data();
      return {
        ...data,
        userId: data.userId,
        joinedAt: data.joinedAt as Timestamp,
        deletedAt: data.deletedAt as Timestamp | undefined
      } as ConversationMember;
    } catch (error) {
      console.error("Lỗi lấy member settings:", error);
      return null;
    }
  },

  subscribeMemberSettings: (
    conversationId: string,
    userId: string,
    callback: (member: ConversationMember | null) => void
  ) => {
    const memberRef = doc(db, 'conversations', conversationId, 'members', userId);

    return onSnapshot(memberRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      const data = snapshot.data();
      const member: ConversationMember = {
        ...data,
        userId: data.userId,
        joinedAt: data.joinedAt as Timestamp,
        deletedAt: data.deletedAt as Timestamp | undefined
      } as ConversationMember;

      callback(member);
    }, (error) => {
      console.error("Lỗi subscribe member settings:", error);
    });
  },

  togglePin: async (conversationId: string, userId: string, pinned: boolean): Promise<void> => {
    try {
      const memberRef = doc(db, 'conversations', conversationId, 'members', userId);
      await updateDoc(memberRef, {
        isPinned: pinned
      });
    } catch (error) {
      console.error("Lỗi ghim hội thoại:", error);
      throw error;
    }
  },

  toggleMute: async (conversationId: string, userId: string, muted: boolean): Promise<void> => {
    try {
      const memberRef = doc(db, 'conversations', conversationId, 'members', userId);
      await updateDoc(memberRef, {
        isMuted: muted
      });
    } catch (error) {
      console.error("Lỗi tắt thông báo hội thoại:", error);
      throw error;
    }
  },

  toggleArchive: async (conversationId: string, userId: string, archived: boolean): Promise<void> => {
    try {
      const memberRef = doc(db, 'conversations', conversationId, 'members', userId);
      await updateDoc(memberRef, {
        isArchived: archived
      });
    } catch (error) {
      console.error("Lỗi lưu trữ hội thoại:", error);
      throw error;
    }
  },

  toggleMarkUnread: async (conversationId: string, userId: string, markedUnread: boolean): Promise<void> => {
    try {
      const memberRef = doc(db, 'conversations', conversationId, 'members', userId);
      await updateDoc(memberRef, {
        markedUnread: markedUnread
      });
    } catch (error) {
      console.error("Lỗi đánh dấu chưa đọc:", error);
      throw error;
    }
  },

  deleteConversation: async (conversationId: string, userId: string): Promise<void> => {
    try {
      const memberRef = doc(db, 'conversations', conversationId, 'members', userId);
      await updateDoc(memberRef, {
        deletedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Lỗi xóa hội thoại:", error);
      throw error;
    }
  },

  incrementUnreadCount: async (conversationId: string, userId: string): Promise<void> => {
    try {
      const memberRef = doc(db, 'conversations', conversationId, 'members', userId);
      await updateDoc(memberRef, {
        unreadCount: increment(1)
      });
    } catch (error) {
      console.error("Lỗi tăng unread count:", error);
      throw error;
    }
  },

  resetUnreadCount: async (conversationId: string, userId: string): Promise<void> => {
    try {
      const memberRef = doc(db, 'conversations', conversationId, 'members', userId);
      await updateDoc(memberRef, {
        unreadCount: 0,
        markedUnread: false
      });
    } catch (error) {
      console.error("Lỗi reset unread count:", error);
      throw error;
    }
  },

  markAllConversationsAsRead: async (userId: string): Promise<void> => {
    try {
      // Query all conversations where user is participant
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('participantIds', 'array-contains', userId)
      );

      const conversationsSnap = await getDocs(conversationsQuery);
      const batch = writeBatch(db);
      let hasUpdates = false;

      for (const convDoc of conversationsSnap.docs) {
        const memberRef = doc(db, 'conversations', convDoc.id, 'members', userId);
        const memberSnap = await getDoc(memberRef);

        if (memberSnap.exists()) {
          const data = memberSnap.data();
          if (data.unreadCount > 0 || data.markedUnread) {
            batch.update(memberRef, {
              unreadCount: 0,
              markedUnread: false
            });
            hasUpdates = true;
          }
        }
      }

      if (hasUpdates) {
        await batch.commit();
      }
    } catch (error) {
      console.error("Lỗi đánh dấu tất cả đã đọc:", error);
      throw error;
    }
  }
};


