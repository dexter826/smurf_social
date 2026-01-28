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
import { Conversation, Message, MessageType, User } from '../types';
import { userService } from './userService';
import { batchGetUsers } from '../utils/batchUtils';

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
      // Thu thập tất cả participant IDs
      const allParticipantIds = new Set<string>();
      snapshot.docs.forEach(d => {
        const data = d.data();
        data.participantIds.forEach((id: string) => {
          if (id !== userId) allParticipantIds.add(id);
        });
      });

      // Batch load tất cả users một lần (bao gồm cả currentUser cho group)
      const usersMap = await batchGetUsers([...allParticipantIds, userId]);

      const conversations = snapshot.docs.map((d) => {
        const data = d.data();
        
        let participants;
        if (data.isGroup) {
          // Group: lấy TẤT CẢ participants bao gồm cả currentUser
          participants = data.participantIds
            .map((id: string) => usersMap[id])
            .filter((p: User | undefined) => !!p);
        } else {
          // Chat 1-1: chỉ lấy đối phương
          const otherParticipantIds = data.participantIds.filter((id: string) => id !== userId);
          participants = otherParticipantIds
            .map((id: string) => usersMap[id])
            .filter((p: User | undefined) => !!p);
        }

        return {
          ...data,
          id: d.id,
          participants,
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          lastMessage: data.lastMessage ? {
            ...data.lastMessage,
            timestamp: data.lastMessage.timestamp?.toDate() || new Date()
          } : undefined
        } as Conversation;
      });

      callback(conversations);
    }, (error) => {
      console.error("Lỗi subscribe conversations", error);
    });
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
   * Lưu trữ/Bỏ lưu trữ conversation
   */
  toggleArchiveConversation: async (conversationId: string, archived: boolean): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, { archived });
    } catch (error) {
      console.error("Lỗi archive conversation", error);
      throw error;
    }
  },

  /**
   * Đánh dấu chưa đọc/đã đọc conversation
   */
  toggleMarkUnreadConversation: async (conversationId: string, markedUnread: boolean): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, { markedUnread });
    } catch (error) {
      console.error("Lỗi mark unread conversation", error);
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
    content: string,
    replyToId?: string,
    isForwarded?: boolean
  ): Promise<void> => {
    try {
      const messageData: any = {
        conversationId,
        senderId,
        content,
        type: 'text' as MessageType,
        timestamp: serverTimestamp(),
        readBy: [senderId],
        deliveredAt: serverTimestamp()
      };

      if (replyToId) messageData.replyToId = replyToId;
      if (isForwarded) messageData.isForwarded = isForwarded;

      const docRef = await addDoc(collection(db, 'messages'), messageData);

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
    file: File,
    replyToId?: string
  ): Promise<void> => {
    try {
      // Upload image
      const timestamp = Date.now();
      const fileRef = ref(storage, `chats/${conversationId}/${timestamp}_${file.name}`);
      await uploadBytes(fileRef, file);
      const imageUrl = await getDownloadURL(fileRef);

      const messageData: any = {
        conversationId,
        senderId,
        content: imageUrl,
        type: 'image' as MessageType,
        fileUrl: imageUrl,
        timestamp: serverTimestamp(),
        readBy: [senderId],
        deliveredAt: serverTimestamp()
      };

      if (replyToId) messageData.replyToId = replyToId;

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
    file: File,
    replyToId?: string
  ): Promise<void> => {
    try {
      const timestamp = Date.now();
      const fileRef = ref(storage, `chats/${conversationId}/${timestamp}_${file.name}`);
      await uploadBytes(fileRef, file);
      const fileUrl = await getDownloadURL(fileRef);

      const messageData: any = {
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

      if (replyToId) messageData.replyToId = replyToId;

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
    file: File,
    replyToId?: string
  ): Promise<void> => {
    try {
      const timestamp = Date.now();
      const fileRef = ref(storage, `chats/${conversationId}/${timestamp}_${file.name}`);
      await uploadBytes(fileRef, file);
      const videoUrl = await getDownloadURL(fileRef);

      const messageData: any = {
        conversationId,
        senderId,
        content: videoUrl,
        type: 'video' as MessageType,
        fileUrl: videoUrl,
        timestamp: serverTimestamp(),
        readBy: [senderId],
        deliveredAt: serverTimestamp()
      };

      if (replyToId) messageData.replyToId = replyToId;

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
    file: File,
    replyToId?: string
  ): Promise<void> => {
    try {
      const timestamp = Date.now();
      const fileRef = ref(storage, `chats/${conversationId}/${timestamp}_${file.name}`);
      await uploadBytes(fileRef, file);
      const voiceUrl = await getDownloadURL(fileRef);

      const messageData: any = {
        conversationId,
        senderId,
        content: voiceUrl,
        type: 'voice' as MessageType,
        fileUrl: voiceUrl,
        timestamp: serverTimestamp(),
        readBy: [senderId],
        deliveredAt: serverTimestamp()
      };

      if (replyToId) messageData.replyToId = replyToId;

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
   * Thu hồi tin nhắn cho tất cả mọi người
   */
  recallMessage: async (messageId: string, conversationId: string): Promise<void> => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        isRecalled: true,
        recalledAt: serverTimestamp(),
        content: 'Tin nhắn đã được thu hồi'
      });
      
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        lastMessageContent: 'Tin nhắn đã được thu hồi',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Lỗi thu hồi tin nhắn", error);
      throw error;
    }
  },

  /**
   * Xóa message cho bản thân (chỉ ẩn ở phía người xóa)
   */
  deleteMessageForMe: async (messageId: string, userId: string): Promise<void> => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        deletedBy: arrayUnion(userId)
      });
    } catch (error) {
      console.error("Lỗi xóa tin nhắn cho tôi", error);
      throw error;
    }
  },

  /**
   * Chỉnh sửa tin nhắn (giới hạn trong 10 phút)
   */
  editMessage: async (messageId: string, newContent: string): Promise<void> => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageSnap = await getDoc(messageRef);
      
      if (!messageSnap.exists()) throw new Error("Tin nhắn không tồn tại");
      
      const data = messageSnap.data();
      const timestamp = data.timestamp?.toDate();
      
      if (timestamp) {
        const now = new Date();
        const diffInMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60);
        
        if (diffInMinutes > 10) {
          throw new Error("Đã hết thời gian chỉnh sửa (tối đa 10 phút)");
        }
      }

      await updateDoc(messageRef, {
        content: newContent,
        isEdited: true,
        editedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Lỗi chỉnh sửa tin nhắn", error);
      throw error;
    }
  },

  /**
   * Chuyển tiếp tin nhắn
   */
  forwardMessage: async (
    targetConversationId: string,
    senderId: string,
    originalMessage: Message
  ): Promise<void> => {
    try {
      const messageData: any = {
        conversationId: targetConversationId,
        senderId,
        content: originalMessage.content,
        type: originalMessage.type,
        timestamp: serverTimestamp(),
        readBy: [senderId],
        deliveredAt: serverTimestamp(),
        isForwarded: true
      };

      if (originalMessage.fileUrl) messageData.fileUrl = originalMessage.fileUrl;
      if (originalMessage.fileName) messageData.fileName = originalMessage.fileName;
      if (originalMessage.fileSize) messageData.fileSize = originalMessage.fileSize;

      await addDoc(collection(db, 'messages'), messageData);

      // Cập nhật conversation đích
      const conversationRef = doc(db, 'conversations', targetConversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        const conversationData = conversationSnap.data();
        const participantIds = conversationData.participantIds || [];
        const unreadCount = conversationData.unreadCount || {};
        
        participantIds.forEach((pid: string) => {
          if (pid !== senderId) {
            unreadCount[pid] = (unreadCount[pid] || 0) + 1;
          }
        });

        let lastMessageContent = originalMessage.content;
        if (originalMessage.type === 'image') lastMessageContent = '📷 Hình ảnh';
        else if (originalMessage.type === 'file') lastMessageContent = `📎 ${originalMessage.fileName}`;
        else if (originalMessage.type === 'video') lastMessageContent = '🎥 Video';
        else if (originalMessage.type === 'voice') lastMessageContent = '🎤 Tin nhắn thoại';

        await updateDoc(conversationRef, {
          lastMessage: {
            ...messageData,
            timestamp: new Date(),
            content: lastMessageContent
          },
          unreadCount,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Lỗi chuyển tiếp tin nhắn", error);
      throw error;
    }
  },

  /**
   * Trả lời tin nhắn
   */
  replyToMessage: async (conversationId: string, senderId: string, content: string, replyToId: string): Promise<void> => {
    try {
      const messageData = {
        conversationId,
        senderId,
        content,
        type: 'text',
        timestamp: serverTimestamp(),
        replyToId,
        readBy: [senderId],
        deliveredAt: null
      };

      const docRef = await addDoc(collection(db, 'messages'), messageData);
      
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        lastMessageId: docRef.id,
        lastMessageContent: content,
        lastMessageSenderId: senderId,
        lastMessageTimestamp: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Lỗi trả lời tin nhắn", error);
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
  },

  // ========== GROUP MANAGEMENT ==========

  /**
   * Tạo group conversation mới
   */
  createGroupConversation: async (
    creatorId: string,
    memberIds: string[],
    groupName: string,
    groupAvatar?: string
  ): Promise<string> => {
    try {
      const participantIds = [creatorId, ...memberIds.filter(id => id !== creatorId)];
      
      const conversationData = {
        participantIds,
        isGroup: true,
        groupName,
        groupAvatar: groupAvatar || null,
        creatorId,
        adminIds: [creatorId],
        unreadCount: participantIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {}),
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        pinned: false,
        muted: false
      };
      
      const docRef = await addDoc(collection(db, 'conversations'), conversationData);
      return docRef.id;
    } catch (error) {
      console.error("Lỗi tạo group", error);
      throw error;
    }
  },

  /**
   * Cập nhật thông tin group (tên, avatar)
   */
  updateGroupInfo: async (
    conversationId: string,
    updates: { groupName?: string; groupAvatar?: string }
  ): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Lỗi cập nhật group info", error);
      throw error;
    }
  },

  /**
   * Thêm thành viên vào group
   */
  addGroupMember: async (conversationId: string, userId: string): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        participantIds: arrayUnion(userId),
        [`unreadCount.${userId}`]: 0,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Lỗi thêm thành viên", error);
      throw error;
    }
  },

  /**
   * Xóa thành viên khỏi group
   */
  removeGroupMember: async (conversationId: string, userId: string): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        const data = conversationSnap.data();
        const newUnreadCount = { ...data.unreadCount };
        delete newUnreadCount[userId];
        
        await updateDoc(conversationRef, {
          participantIds: arrayRemove(userId),
          adminIds: arrayRemove(userId),
          unreadCount: newUnreadCount,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Lỗi xóa thành viên", error);
      throw error;
    }
  },

  /**
   * Rời khỏi group
   */
  leaveGroup: async (conversationId: string, userId: string): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        const data = conversationSnap.data();
        const newUnreadCount = { ...data.unreadCount };
        delete newUnreadCount[userId];
        
        const newParticipantIds = data.participantIds.filter((id: string) => id !== userId);
        const newAdminIds = (data.adminIds || []).filter((id: string) => id !== userId);
        
        // Nếu người rời là creator và còn admin khác -> chuyển creator
        // Nếu không còn ai -> xóa group
        if (newParticipantIds.length === 0) {
          await chatService.deleteConversation(conversationId);
        } else {
          const updates: any = {
            participantIds: newParticipantIds,
            adminIds: newAdminIds,
            unreadCount: newUnreadCount,
            updatedAt: serverTimestamp()
          };
          
          // Nếu creator rời, chuyển cho admin đầu tiên hoặc member đầu tiên
          if (data.creatorId === userId) {
            updates.creatorId = newAdminIds[0] || newParticipantIds[0];
            if (newAdminIds.length === 0) {
              updates.adminIds = [newParticipantIds[0]];
            }
          }
          
          await updateDoc(conversationRef, updates);
        }
      }
    } catch (error) {
      console.error("Lỗi rời group", error);
      throw error;
    }
  },

  /**
   * Thăng thành viên làm admin
   */
  promoteToAdmin: async (conversationId: string, userId: string): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        adminIds: arrayUnion(userId)
      });
    } catch (error) {
      console.error("Lỗi thăng admin", error);
      throw error;
    }
  },

  /**
   * Hạ quyền admin
   */
  demoteFromAdmin: async (conversationId: string, userId: string): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        adminIds: arrayRemove(userId)
      });
    } catch (error) {
      console.error("Lỗi hạ quyền admin", error);
      throw error;
    }
  },
};
