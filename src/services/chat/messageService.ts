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
  arrayUnion,
  arrayRemove,
  limit,
  startAfter,
  deleteField
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { Message, MessageType } from "../../types";
import { TIME_LIMITS } from "../../constants";
import { compressImage, withRetry } from "../../utils/imageUtils";
import { uploadWithProgress, ProgressCallback } from "../../utils/uploadUtils";

export const messageService = {
  // Đăng ký nhận tin nhắn thời gian thực với giới hạn số lượng
  subscribeToMessages: (
    conversationId: string,
    limitCount: number,
    callback: (messages: Message[], lastDoc: any) => void,
    joinedAt?: Date,
  ) => {
    let q = query(
      collection(db, "messages"),
      where("conversationId", "==", conversationId),
      orderBy("timestamp", "desc"),
      limit(limitCount),
    );

    if (joinedAt) {
      q = query(
        collection(db, "messages"),
        where("conversationId", "==", conversationId),
        where("timestamp", ">=", joinedAt),
        orderBy("timestamp", "desc"),
        limit(limitCount),
      );
    }

    return onSnapshot(
      q,
      (snapshot) => {
        const messages = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              ...data,
              id: doc.id,
              timestamp: data.timestamp?.toDate() || new Date(),
              deliveredAt: data.deliveredAt?.toDate(),
              readBy: data.readBy || [],
              deliveredTo: data.deliveredTo || [],
              mentions: data.mentions || [],
            };
          })
          .reverse() as Message[]; // Reverse để hiển thị đúng thứ tự thời gian

        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        callback(messages, lastDoc);
      },
      (error) => {
        console.error("Lỗi subscribe messages", error);
      },
    );
  },

  // Lấy thêm tin nhắn cũ (Phân trang)
  getMoreMessages: async (
    conversationId: string,
    lastVisibleDoc: any,
    limitCount: number,
    joinedAt?: Date,
  ): Promise<{ messages: Message[]; lastDoc: any }> => {
    try {
      let q = query(
        collection(db, "messages"),
        where("conversationId", "==", conversationId),
        orderBy("timestamp", "desc"),
        startAfter(lastVisibleDoc),
        limit(limitCount),
      );

      if (joinedAt) {
        q = query(
          collection(db, "messages"),
          where("conversationId", "==", conversationId),
          where("timestamp", ">=", joinedAt),
          orderBy("timestamp", "desc"),
          startAfter(lastVisibleDoc),
          limit(limitCount),
        );
      }

      const snapshot = await getDocs(q);
      const messages = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            timestamp: data.timestamp?.toDate() || new Date(),
            deliveredAt: data.deliveredAt?.toDate(),
            readBy: data.readBy || [],
            deliveredTo: data.deliveredTo || [],
            mentions: data.mentions || [],
          };
        })
        .reverse() as Message[];

      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      return { messages, lastDoc };
    } catch (error) {
      console.error("Lỗi lấy thêm tin nhắn", error);
      throw error;
    }
  },

  // Gửi tin nhắn văn bản kèm tag người dùng
  sendTextMessage: async (
    conversationId: string,
    senderId: string,
    content: string,
    replyToId?: string,
    isForwarded?: boolean,
    mentions?: string[],
  ): Promise<void> => {
    try {
      const messageData: any = {
        conversationId,
        senderId,
        content,
        type: "text" as MessageType,
        timestamp: serverTimestamp(),
        readBy: [senderId],
        deliveredTo: [senderId],
        deliveredAt: serverTimestamp(),
        mentions: mentions || [],
      };

      if (replyToId) messageData.replyToId = replyToId;
      if (isForwarded) messageData.isForwarded = isForwarded;

      const docRef = await addDoc(collection(db, "messages"), messageData);

      const conversationRef = doc(db, "conversations", conversationId);
      const conversationSnap = await getDoc(conversationRef);

      if (conversationSnap.exists()) {
        const participantIds = conversationSnap.data().participantIds || [];
        const unreadCount = conversationSnap.data().unreadCount || {};

        // Cập nhật số tin chưa đọc cho các thành viên khác
        participantIds.forEach((pid: string) => {
          if (pid !== senderId) {
            unreadCount[pid] = (unreadCount[pid] || 0) + 1;
          }
        });

        await updateDoc(conversationRef, {
          lastMessage: {
            ...messageData,
            timestamp: new Date(),
            id: docRef.id,
          },
          unreadCount,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Lỗi gửi tin nhắn", error);
      throw error;
    }
  },

  // Tải lên và gửi tin nhắn hình ảnh
  sendImageMessage: async (
    conversationId: string,
    senderId: string,
    file: File,
    replyToId?: string,
    onProgress?: ProgressCallback,
  ): Promise<void> => {
    try {
      // Compress ảnh trước khi upload
      const compressedFile = await compressImage(file, { maxSizeMB: 0.8, maxWidthOrHeight: 1920 });
      
      const timestamp = Date.now();
      const path = `chats/${conversationId}/${timestamp}_${file.name}`;
      
      const imageUrl = await withRetry(() => 
        uploadWithProgress(path, compressedFile, onProgress)
      );

      const messageData: Record<string, any> = {
        conversationId,
        senderId,
        content: imageUrl,
        type: "image" as MessageType,
        fileUrl: imageUrl,
        timestamp: serverTimestamp(),
        readBy: [senderId],
        deliveredTo: [senderId],
        deliveredAt: serverTimestamp(),
      };

      if (replyToId) messageData.replyToId = replyToId;

      await addDoc(collection(db, "messages"), messageData);

      const conversationRef = doc(db, "conversations", conversationId);
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
            content: "📷 Hình ảnh",
          },
          unreadCount,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Lỗi gửi ảnh", error);
      throw error;
    }
  },

  // Tải lên và gửi tin nhắn tệp đính kèm
  sendFileMessage: async (
    conversationId: string,
    senderId: string,
    file: File,
    replyToId?: string,
    onProgress?: ProgressCallback,
  ): Promise<void> => {
    try {
      const timestamp = Date.now();
      const path = `chats/${conversationId}/${timestamp}_${file.name}`;
      
      const fileUrl = await withRetry(() => 
        uploadWithProgress(path, file, onProgress)
      );

      const messageData: Record<string, any> = {
        conversationId,
        senderId,
        content: file.name,
        type: "file" as MessageType,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        timestamp: serverTimestamp(),
        readBy: [senderId],
        deliveredTo: [senderId],
        deliveredAt: serverTimestamp(),
      };

      if (replyToId) messageData.replyToId = replyToId;

      await addDoc(collection(db, "messages"), messageData);

      const conversationRef = doc(db, "conversations", conversationId);
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
            content: `📎 ${file.name}`,
          },
          unreadCount,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Lỗi gửi file", error);
      throw error;
    }
  },

  // Tải lên và gửi tin nhắn video
  sendVideoMessage: async (
    conversationId: string,
    senderId: string,
    file: File,
    replyToId?: string,
    onProgress?: ProgressCallback,
  ): Promise<void> => {
    try {
      const timestamp = Date.now();
      const path = `chats/${conversationId}/${timestamp}_${file.name}`;
      
      const videoUrl = await withRetry(() => 
        uploadWithProgress(path, file, onProgress)
      );

      const thumbnailUrl = videoUrl.replace(/\.[^/.]+$/, ".jpg");

      const messageData: Record<string, any> = {
        conversationId,
        senderId,
        content: videoUrl,
        type: "video" as MessageType,
        fileUrl: videoUrl,
        timestamp: serverTimestamp(),
        readBy: [senderId],
        deliveredTo: [senderId],
        deliveredAt: serverTimestamp(),
      };

      if (thumbnailUrl) messageData.videoThumbnails = { [videoUrl]: thumbnailUrl };
      if (replyToId) messageData.replyToId = replyToId;

      await addDoc(collection(db, "messages"), messageData);

      const conversationRef = doc(db, "conversations", conversationId);
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
            content: "🎥 Video",
          },
          unreadCount,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Lỗi gửi video", error);
      throw error;
    }
  },

  // Tải lên và gửi tin nhắn thoại
  sendVoiceMessage: async (
    conversationId: string,
    senderId: string,
    file: File,
    replyToId?: string,
    onProgress?: ProgressCallback,
  ): Promise<void> => {
    try {
      const timestamp = Date.now();
      const path = `chats/${conversationId}/${timestamp}_${file.name}`;
      
      const voiceUrl = await withRetry(() => 
        uploadWithProgress(path, file, onProgress)
      );

      const messageData: Record<string, any> = {
        conversationId,
        senderId,
        content: voiceUrl,
        type: "voice" as MessageType,
        fileUrl: voiceUrl,
        timestamp: serverTimestamp(),
        readBy: [senderId],
        deliveredTo: [senderId],
        deliveredAt: serverTimestamp(),
      };

      if (replyToId) messageData.replyToId = replyToId;

      await addDoc(collection(db, "messages"), messageData);

      const conversationRef = doc(db, "conversations", conversationId);
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
            content: "🎤 Tin nhắn thoại",
          },
          unreadCount,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Lỗi gửi voice", error);
      throw error;
    }
  },

  // Đánh dấu người dùng đã nhận tin nhắn
  markMessagesAsDelivered: async (
    conversationId: string,
    userId: string,
  ): Promise<void> => {
    try {
      const q = query(
        collection(db, "messages"),
        where("conversationId", "==", conversationId),
        where("senderId", "!=", userId),
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      let count = 0;

      snapshot.docs.forEach((d) => {
        const data = d.data();
        const deliveredTo = data.deliveredTo || [];

        if (!deliveredTo.includes(userId)) {
          const updates: Record<string, any> = {
            deliveredTo: arrayUnion(userId),
          };

          if (!data.deliveredAt) {
            updates.deliveredAt = serverTimestamp();
          }

          batch.update(d.ref, updates);
          count++;
        }
      });

      if (count > 0) await batch.commit();
    } catch (error) {
      console.error("Lỗi mark as delivered", error);
    }
  },

  // Đánh dấu người dùng đã xem tin nhắn
  markMessagesAsRead: async (
    conversationId: string,
    userId: string,
  ): Promise<void> => {
    try {
      const batch = writeBatch(db);

      const messagesQuery = query(
        collection(db, "messages"),
        where("conversationId", "==", conversationId),
        where("senderId", "!=", userId),
      );

      const messagesSnapshot = await getDocs(messagesQuery);
      let count = 0;

      messagesSnapshot.docs.forEach((messageDoc) => {
        const data = messageDoc.data();
        const readBy = data.readBy || [];

        if (!readBy.includes(userId)) {
          batch.update(messageDoc.ref, {
            readBy: arrayUnion(userId),
            deliveredTo: arrayUnion(userId),
            deliveredAt: data.deliveredAt || serverTimestamp(),
          });
          count++;
        }
      });

      const conversationRef = doc(db, "conversations", conversationId);
      const conversationSnap = await getDoc(conversationRef);

      if (conversationSnap.exists()) {
        const data = conversationSnap.data();
        const updates: Record<string, any> = {
          [`unreadCount.${userId}`]: 0,
        };

        if (data.lastMessage && data.lastMessage.senderId !== userId) {
          updates["lastMessage.readBy"] = arrayUnion(userId);
          updates["lastMessage.deliveredTo"] = arrayUnion(userId);

          if (!data.lastMessage.deliveredAt) {
            updates["lastMessage.deliveredAt"] = serverTimestamp();
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

  // Thu hồi tin nhắn đối với tất cả người dùng
  recallMessage: async (
    messageId: string,
    conversationId: string,
  ): Promise<void> => {
    try {
      const messageRef = doc(db, "messages", messageId);
      await updateDoc(messageRef, {
        isRecalled: true,
        recalledAt: serverTimestamp(),
        content: "Tin nhắn đã được thu hồi",
      });

      const conversationRef = doc(db, "conversations", conversationId);
      await updateDoc(conversationRef, {
        lastMessageContent: "Tin nhắn đã được thu hồi",
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Lỗi thu hồi tin nhắn", error);
      throw error;
    }
  },

  // Ẩn tin nhắn đối với người xóa
  deleteMessageForMe: async (
    messageId: string,
    userId: string,
  ): Promise<void> => {
    try {
      const messageRef = doc(db, "messages", messageId);
      await updateDoc(messageRef, {
        deletedBy: arrayUnion(userId),
      });
    } catch (error) {
      console.error("Lỗi xóa tin nhắn cho tôi", error);
      throw error;
    }
  },

  // Chỉnh sửa tin nhắn trong thời gian cho phép
  editMessage: async (messageId: string, newContent: string): Promise<void> => {
    try {
      const messageRef = doc(db, "messages", messageId);
      const messageSnap = await getDoc(messageRef);

      if (!messageSnap.exists()) throw new Error("Tin nhắn không tồn tại");

      const data = messageSnap.data();
      const timestamp = data.timestamp?.toDate();

      if (timestamp) {
        const now = new Date();
        const diffInMinutes = now.getTime() - timestamp.getTime();

        if (diffInMinutes > TIME_LIMITS.MESSAGE_EDIT_WINDOW) {
          throw new Error(
            `Đã hết thời gian chỉnh sửa (tối đa ${TIME_LIMITS.MESSAGE_EDIT_WINDOW / (1000 * 60)} phút)`,
          );
        }
      }

      await updateDoc(messageRef, {
        content: newContent,
        isEdited: true,
        editedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Lỗi chỉnh sửa tin nhắn", error);
      throw error;
    }
  },

  // Chuyển tiếp tin nhắn sang hội thoại khác
  forwardMessage: async (
    targetConversationId: string,
    senderId: string,
    originalMessage: Message,
  ): Promise<void> => {
    try {
      const messageData: Record<string, any> = {
        conversationId: targetConversationId,
        senderId,
        content: originalMessage.content,
        type: originalMessage.type,
        timestamp: serverTimestamp(),
        readBy: [senderId],
        deliveredTo: [senderId],
        deliveredAt: serverTimestamp(),
        isForwarded: true,
      };

      if (originalMessage.fileUrl)
        messageData.fileUrl = originalMessage.fileUrl;
      if (originalMessage.fileName)
        messageData.fileName = originalMessage.fileName;
      if (originalMessage.fileSize)
        messageData.fileSize = originalMessage.fileSize;

      await addDoc(collection(db, "messages"), messageData);

      const conversationRef = doc(db, "conversations", targetConversationId);
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
        if (originalMessage.type === "image")
          lastMessageContent = "📷 Hình ảnh";
        else if (originalMessage.type === "file")
          lastMessageContent = `📎 ${originalMessage.fileName}`;
        else if (originalMessage.type === "video")
          lastMessageContent = "🎥 Video";
        else if (originalMessage.type === "voice")
          lastMessageContent = "🎤 Tin nhắn thoại";

        await updateDoc(conversationRef, {
          lastMessage: {
            ...messageData,
            timestamp: new Date(),
            content: lastMessageContent,
          },
          unreadCount,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Lỗi chuyển tiếp tin nhắn", error);
      throw error;
    }
  },

  // Gửi tin nhắn phản hồi tin nhắn khác
  replyToMessage: async (
    conversationId: string,
    senderId: string,
    content: string,
    replyToId: string,
  ): Promise<void> => {
    try {
      const messageData = {
        conversationId,
        senderId,
        content,
        type: "text",
        timestamp: serverTimestamp(),
        replyToId,
        readBy: [senderId],
        deliveredTo: [senderId],
        deliveredAt: null,
      };

      const docRef = await addDoc(collection(db, "messages"), messageData);

      const conversationRef = doc(db, "conversations", conversationId);
      await updateDoc(conversationRef, {
        lastMessageId: docRef.id,
        lastMessageContent: content,
        lastMessageSenderId: senderId,
        lastMessageTimestamp: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Lỗi trả lời tin nhắn", error);
      throw error;
    }
  },

  // Cập nhật trạng thái đang soạn tin nhắn
  setTypingStatus: async (
    conversationId: string,
    userId: string,
    isTyping: boolean,
  ): Promise<void> => {
    try {
      const conversationRef = doc(db, "conversations", conversationId);

      if (isTyping) {
        await updateDoc(conversationRef, {
          typingUsers: arrayUnion(userId),
        });
      } else {
        await updateDoc(conversationRef, {
          typingUsers: arrayRemove(userId),
        });
      }
    } catch (error) {
      console.error("Lỗi set typing status", error);
    }
  },

  // Theo dõi danh sách người dùng đang soạn tin nhắn
  subscribeToTypingStatus: (
    conversationId: string,
    callback: (typingUsers: string[]) => void,
  ) => {
    const conversationRef = doc(db, "conversations", conversationId);

    return onSnapshot(conversationRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback(data.typingUsers || []);
      }
    });
  },

  // Bật/tắt cảm xúc tin nhắn
  toggleReaction: async (
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<void> => {
    try {
      const messageRef = doc(db, "messages", messageId);
      
      const messageSnap = await getDoc(messageRef);
      if (messageSnap.exists()) {
        const data = messageSnap.data();
        const currentReaction = data.reactions?.[userId];
        
        if (emoji === 'REMOVE' || currentReaction === emoji) {
           await updateDoc(messageRef, {
             [`reactions.${userId}`]: deleteField()
           });
        } else {
           await updateDoc(messageRef, {
             [`reactions.${userId}`]: emoji
           });
        }
      }
    } catch (error) {
      console.error("Lỗi toggle reaction", error);
      throw error;
    }
  },

  // Gửi tin nhắn hệ thống (không tăng unread count)
  sendSystemMessage: async (
    conversationId: string,
    content: string,
  ): Promise<void> => {
    try {
      const messageData = {
        conversationId,
        senderId: 'system',
        content,
        type: 'system' as MessageType,
        timestamp: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'messages'), messageData);

      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        lastMessage: {
          ...messageData,
          id: docRef.id,
          timestamp: new Date(),
        },
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Lỗi gửi tin nhắn hệ thống:", error);
    }
  },
};
