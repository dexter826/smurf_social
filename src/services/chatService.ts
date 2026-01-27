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
  deleteDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  setDoc,
  arrayUnion,
  arrayRemove,
  increment,
  writeBatch,
  DocumentSnapshot,
  limit as firestoreLimit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { Conversation, Message, MessageType } from '../types';
import { userService } from './userService';

export const chatService = {
  // ========== CONVERSATIONS ==========
  
  /**
   * Lấy hoặc tạo conversation 1-1 giữa 2 users
   */
  getOrCreateConversation: async (user1Id: string, user2Id: string): Promise<string> => {
    try {
      const participantIds = [user1Id, user2Id].sort();
      
      // Tìm conversation có sẵn
      const q = query(
        collection(db, 'conversations'),
        where('participantIds', '==', participantIds),
        where('isGroup', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
      }
      
      // Tạo conversation mới
      const conversationData = {
        participantIds,
        isGroup: false,
        unreadCount: {
          [user1Id]: 0,
          [user2Id]: 0
        },
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        pinned: false,
        muted: false
      };
      
      const docRef = await addDoc(collection(db, 'conversations'), conversationData);
      return docRef.id;
    } catch (error) {
      console.error("Lỗi tạo conversation", error);
      throw error;
    }
  },

  /**
   * Subscribe realtime conversations của user
   */
  subscribeToConversations: (userId: string, callback: (conversations: Conversation[]) => void) => {
    const q = query(
      collection(db, 'conversations'), 
      where('participantIds', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, async (snapshot) => {
      const conversations = await Promise.all(
        snapshot.docs.map(async (d) => {
          const data = d.data();
          const otherParticipantIds = data.participantIds.filter((id: string) => id !== userId);
          
          const participants = await Promise.all(
            otherParticipantIds.map((id: string) => userService.getUserById(id))
          );

          return {
            ...data,
            id: d.id,
            participants: participants.filter(p => !!p),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
            lastMessage: data.lastMessage ? {
              ...data.lastMessage,
              timestamp: data.lastMessage.timestamp?.toDate() || new Date()
            } : undefined
          } as Conversation;
        })
      );

      callback(conversations);
    }, (error) => {
      console.error("Lỗi subscribe conversations", error);
    });
  },

  /**
   * Tìm kiếm conversations
   */
  searchConversations: async (userId: string, searchTerm: string): Promise<Conversation[]> => {
    try {
      const q = query(
        collection(db, 'conversations'),
        where('participantIds', 'array-contains', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const conversations = await Promise.all(
        querySnapshot.docs.map(async (d) => {
          const data = d.data();
          const otherParticipantIds = data.participantIds.filter((id: string) => id !== userId);
          
          const participants = await Promise.all(
            otherParticipantIds.map((id: string) => userService.getUserById(id))
          );

          return {
            ...data,
            id: d.id,
            participants: participants.filter(p => !!p),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
          } as Conversation;
        })
      );

      // Filter theo tên
      return conversations.filter(conv => {
        if (conv.isGroup) {
          return conv.groupName?.toLowerCase().includes(searchTerm.toLowerCase());
        } else {
          return conv.participants.some(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
      });
    } catch (error) {
      console.error("Lỗi search conversations", error);
      return [];
    }
  },

  /**
   * Pin/Unpin conversation
   */
  togglePinConversation: async (conversationId: string, pinned: boolean): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, { pinned });
    } catch (error) {
      console.error("Lỗi pin conversation", error);
      throw error;
    }
  },

  /**
   * Mute/Unmute conversation
   */
  toggleMuteConversation: async (conversationId: string, muted: boolean): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, { muted });
    } catch (error) {
      console.error("Lỗi mute conversation", error);
      throw error;
    }
  },

  /**
   * Xóa conversation
   */
  deleteConversation: async (conversationId: string): Promise<void> => {
    try {
      const batch = writeBatch(db);
      
      // Xóa tất cả messages
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      messagesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Xóa conversation
      batch.delete(doc(db, 'conversations', conversationId));
      
      await batch.commit();
    } catch (error) {
      console.error("Lỗi xóa conversation", error);
      throw error;
    }
  },

  // ========== MESSAGES ==========

  /**
   * Subscribe realtime messages
   */
  subscribeToMessages: (conversationId: string, callback: (messages: Message[]) => void) => {
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp?.toDate() || new Date(),
        deliveredAt: doc.data().deliveredAt?.toDate()
      })) as Message[];
      
      callback(messages);
    }, (error) => {
      console.error("Lỗi subscribe messages", error);
    });
  },

  /**
   * Gửi text message
   */
  sendTextMessage: async (
    conversationId: string, 
    senderId: string, 
    content: string
  ): Promise<void> => {
    try {
      const messageData = {
        conversationId,
        senderId,
        content,
        type: 'text' as MessageType,
        timestamp: serverTimestamp(),
        readBy: [senderId],
        deliveredAt: serverTimestamp()
      };

      await addDoc(collection(db, 'messages'), messageData);

      // Cập nhật conversation
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        const participantIds = conversationSnap.data().participantIds || [];
        const unreadCount = conversationSnap.data().unreadCount || {};
        
        // Tăng unread count cho người nhận
        participantIds.forEach((pid: string) => {
          if (pid !== senderId) {
            unreadCount[pid] = (unreadCount[pid] || 0) + 1;
          }
        });

        await updateDoc(conversationRef, {
          lastMessage: {
            ...messageData,
            timestamp: new Date()
          },
          unreadCount,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Lỗi gửi tin nhắn", error);
      throw error;
    }
  },

  /**
   * Upload và gửi image message
   */
  sendImageMessage: async (
    conversationId: string,
    senderId: string,
    file: File
  ): Promise<void> => {
    try {
      // Upload image
      const timestamp = Date.now();
      const fileRef = ref(storage, `chats/${conversationId}/${timestamp}_${file.name}`);
      await uploadBytes(fileRef, file);
      const imageUrl = await getDownloadURL(fileRef);

      const messageData = {
        conversationId,
        senderId,
        content: imageUrl,
        type: 'image' as MessageType,
        fileUrl: imageUrl,
        timestamp: serverTimestamp(),
        readBy: [senderId],
        deliveredAt: serverTimestamp()
      };

      await addDoc(collection(db, 'messages'), messageData);

      // Cập nhật conversation
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        const participantIds = conversationSnap.data().participantIds || [];
        const unreadCount = conversationSnap.data().unreadCount || {};
        
        participantIds.forEach((pid: string) => {
          if (pid !== senderId) {
            unreadCount[pid] = (unreadCount[pid] || 0) + 1;
          }
        });

        await updateDoc(conversationRef, {
          lastMessage: {
            ...messageData,
            timestamp: new Date(),
            content: '📷 Hình ảnh'
          },
          unreadCount,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Lỗi gửi ảnh", error);
      throw error;
    }
  },

  /**
   * Upload và gửi file message
   */
  sendFileMessage: async (
    conversationId: string,
    senderId: string,
    file: File
  ): Promise<void> => {
    try {
      const timestamp = Date.now();
      const fileRef = ref(storage, `chats/${conversationId}/${timestamp}_${file.name}`);
      await uploadBytes(fileRef, file);
      const fileUrl = await getDownloadURL(fileRef);

      const messageData = {
        conversationId,
        senderId,
        content: file.name,
        type: 'file' as MessageType,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        timestamp: serverTimestamp(),
        readBy: [senderId],
        deliveredAt: serverTimestamp()
      };

      await addDoc(collection(db, 'messages'), messageData);

      // Cập nhật conversation
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        const participantIds = conversationSnap.data().participantIds || [];
        const unreadCount = conversationSnap.data().unreadCount || {};
        
        participantIds.forEach((pid: string) => {
          if (pid !== senderId) {
            unreadCount[pid] = (unreadCount[pid] || 0) + 1;
          }
        });

        await updateDoc(conversationRef, {
          lastMessage: {
            ...messageData,
            timestamp: new Date(),
            content: `📎 ${file.name}`
          },
          unreadCount,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Lỗi gửi file", error);
      throw error;
    }
  },

  /**
   * Upload và gửi video message
   */
  sendVideoMessage: async (
    conversationId: string,
    senderId: string,
    file: File
  ): Promise<void> => {
    try {
      const timestamp = Date.now();
      const fileRef = ref(storage, `chats/${conversationId}/${timestamp}_${file.name}`);
      await uploadBytes(fileRef, file);
      const videoUrl = await getDownloadURL(fileRef);

      const messageData = {
        conversationId,
        senderId,
        content: videoUrl,
        type: 'video' as MessageType,
        fileUrl: videoUrl,
        timestamp: serverTimestamp(),
        readBy: [senderId],
        deliveredAt: serverTimestamp()
      };

      await addDoc(collection(db, 'messages'), messageData);

      // Cập nhật conversation
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        const participantIds = conversationSnap.data().participantIds || [];
        const unreadCount = conversationSnap.data().unreadCount || {};
        
        participantIds.forEach((pid: string) => {
          if (pid !== senderId) {
            unreadCount[pid] = (unreadCount[pid] || 0) + 1;
          }
        });

        await updateDoc(conversationRef, {
          lastMessage: {
            ...messageData,
            timestamp: new Date(),
            content: '🎥 Video'
          },
          unreadCount,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Lỗi gửi video", error);
      throw error;
    }
  },

  /**
   * Upload và gửi voice message
   */
  sendVoiceMessage: async (
    conversationId: string,
    senderId: string,
    file: File
  ): Promise<void> => {
    try {
      const timestamp = Date.now();
      const fileRef = ref(storage, `chats/${conversationId}/${timestamp}_${file.name}`);
      await uploadBytes(fileRef, file);
      const voiceUrl = await getDownloadURL(fileRef);

      const messageData = {
        conversationId,
        senderId,
        content: voiceUrl,
        type: 'voice' as MessageType,
        fileUrl: voiceUrl,
        timestamp: serverTimestamp(),
        readBy: [senderId],
        deliveredAt: serverTimestamp()
      };

      await addDoc(collection(db, 'messages'), messageData);

      // Cập nhật conversation
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        const participantIds = conversationSnap.data().participantIds || [];
        const unreadCount = conversationSnap.data().unreadCount || {};
        
        participantIds.forEach((pid: string) => {
          if (pid !== senderId) {
            unreadCount[pid] = (unreadCount[pid] || 0) + 1;
          }
        });

        await updateDoc(conversationRef, {
          lastMessage: {
            ...messageData,
            timestamp: new Date(),
            content: '🎤 Tin nhắn thoại'
          },
          unreadCount,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Lỗi gửi voice", error);
      throw error;
    }
  },

  /**
   * Đánh dấu messages là đã nhận (Delivered)
   */
  markMessagesAsDelivered: async (conversationId: string, userId: string): Promise<void> => {
    try {
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('senderId', '!=', userId)
      );
      
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      let count = 0;

      snapshot.docs.forEach(d => {
        const data = d.data();
        if (!data.deliveredAt) {
          batch.update(d.ref, { deliveredAt: serverTimestamp() });
          count++;
        }
      });

      if (count > 0) await batch.commit();
    } catch (error) {
      console.error("Lỗi mark as delivered", error);
    }
  },

  /**
   * Đánh dấu messages là đã đọc
   */
  markMessagesAsRead: async (conversationId: string, userId: string): Promise<void> => {
    try {
      const batch = writeBatch(db);

      // Lấy messages mà mình chưa đọc (senderId !== userId)
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('senderId', '!=', userId)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      let count = 0;
      
      messagesSnapshot.docs.forEach(messageDoc => {
        const data = messageDoc.data();
        const readBy = data.readBy || [];
        
        if (!readBy.includes(userId)) {
          batch.update(messageDoc.ref, {
            readBy: arrayUnion(userId),
            // Nếu xem thì chắc chắn là đã nhận
            deliveredAt: data.deliveredAt || serverTimestamp()
          });
          count++;
        }
      });

      // Update conversation: Reset unread count AND update lastMessage.readBy
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        const data = conversationSnap.data();
        const updates: any = {
          [`unreadCount.${userId}`]: 0
        };

        // Update lastMessage read status if needed
        if (data.lastMessage && data.lastMessage.senderId !== userId) {
          updates['lastMessage.readBy'] = arrayUnion(userId);
          
          // Also sync deliveredAt if present in updates (optional, but good for consistency)
          if (!data.lastMessage.deliveredAt) {
             updates['lastMessage.deliveredAt'] = serverTimestamp();
          }
        }

        batch.update(conversationRef, updates);
      }

      await batch.commit();
    } catch (error) {
      console.error("Lỗi mark as read", error);
      throw error;
    }
  },

  /**
   * Xóa message
   */
  deleteMessage: async (messageId: string, fileUrl?: string): Promise<void> => {
    try {
      // Xóa file nếu có
      if (fileUrl) {
        try {
          const fileRef = ref(storage, fileUrl);
          await deleteObject(fileRef);
        } catch (error) {
          console.warn("File không tồn tại hoặc đã bị xóa");
        }
      }

      // Xóa message
      await deleteDoc(doc(db, 'messages', messageId));
    } catch (error) {
      console.error("Lỗi xóa message", error);
      throw error;
    }
  },

  // ========== TYPING INDICATOR ==========

  /**
   * Cập nhật typing status
   */
  setTypingStatus: async (conversationId: string, userId: string, isTyping: boolean): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      
      if (isTyping) {
        await updateDoc(conversationRef, {
          typingUsers: arrayUnion(userId)
        });
      } else {
        await updateDoc(conversationRef, {
          typingUsers: arrayRemove(userId)
        });
      }
    } catch (error) {
      console.error("Lỗi set typing status", error);
    }
  },

  /**
   * Subscribe typing users
   */
  subscribeToTypingStatus: (conversationId: string, callback: (typingUsers: string[]) => void) => {
    const conversationRef = doc(db, 'conversations', conversationId);
    
    return onSnapshot(conversationRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback(data.typingUsers || []);
      }
    });
  },

  // ========== REACTIONS ==========

  /**
   * Thêm/Xóa reaction cho message
   */
  toggleReaction: async (messageId: string, userId: string, emoji: string): Promise<void> => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageSnap = await getDoc(messageRef);
      
      if (messageSnap.exists()) {
        const reactions = messageSnap.data().reactions || {};
        
        if (reactions[userId] === emoji) {
          delete reactions[userId];
        } else {
          reactions[userId] = emoji;
        }

        await updateDoc(messageRef, { reactions });
      }
    } catch (error) {
      console.error("Lỗi toggle reaction", error);
      throw error;
    }
  }
};