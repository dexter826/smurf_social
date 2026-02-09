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
  deleteField,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  DocumentData
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { Message, MessageType } from "../../types";
import { TIME_LIMITS, IMAGE_COMPRESSION } from "../../constants";
import { compressImage } from "../../utils/imageUtils";
import { withRetry } from "../../utils/retryUtils";
import { uploadWithProgress, ProgressCallback } from "../../utils/uploadUtils";

// Đồng bộ trạng thái hội thoại và đếm tin nhắn mới.
async function updateConversationAfterMessage(
  conversationId: string,
  senderId: string,
  messageData: Partial<Message>,
  displayContent: string,
  messageId?: string,
): Promise<void> {
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
        id: messageId,
        createdAt: new Date(),
        content: displayContent,
      },
      unreadCount,
      updatedAt: serverTimestamp(),
      deletedBy: []
    });
  }
}

// Xử lý tải lên và gửi tin nhắn đa phương tiện.
async function createAndSendMediaMessage(
  conversationId: string,
  senderId: string,
  file: File,
  type: MessageType,
  options: {
    replyToId?: string;
    onProgress?: ProgressCallback;
    compress?: boolean;
    displayContent: string;
  }
): Promise<void> {
  let uploadFile: File = file;
  
  // Compress ảnh nếu cần
  if (options.compress && type === MessageType.IMAGE) {
    uploadFile = await compressImage(file, IMAGE_COMPRESSION.CHAT);
  }
  
  const createdAt = Date.now();
  const path = `chats/${conversationId}/${createdAt}_${file.name}`;
  
  const fileUrl = await withRetry(() => 
    uploadWithProgress(path, uploadFile, options.onProgress)
  );

  const messageData: Partial<Message> = {
    conversationId,
    senderId,
    content: type === MessageType.FILE ? file.name : fileUrl,
    type,
    fileUrl,
    createdAt: serverTimestamp() as unknown as Date,
    readBy: [senderId],
    deliveredTo: [senderId],
    deliveredAt: serverTimestamp() as unknown as Date,
  };

  // Thêm metadata theo loại
  if (type === MessageType.FILE) {
    messageData.fileName = file.name;
    messageData.fileSize = file.size;
  }
  if (type === MessageType.VIDEO) {
    const thumbnailUrl = fileUrl.replace(/\.[^/.]+$/, ".jpg");
    messageData.videoThumbnails = { [fileUrl]: thumbnailUrl };
  }
  if (options.replyToId) {
    messageData.replyToId = options.replyToId;
  }

  const docRef = await addDoc(collection(db, "messages"), messageData);
  
  await updateConversationAfterMessage(
    conversationId,
    senderId,
    messageData,
    options.displayContent,
    docRef.id
  );
}

export const messageService = {
  // Đăng ký nhận tin nhắn thời gian thực với giới hạn số lượng
  subscribeToMessages: (
    conversationId: string,
    limitCount: number,
    callback: (messages: Message[], lastDoc: DocumentSnapshot | null) => void,
    joinedAt?: Date,
  ) => {
    let q = query(
      collection(db, "messages"),
      where("conversationId", "==", conversationId),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    );

    if (joinedAt) {
      q = query(
        collection(db, "messages"),
        where("conversationId", "==", conversationId),
        where("createdAt", ">=", joinedAt),
        orderBy("createdAt", "desc"),
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
              createdAt: data.createdAt?.toDate() || new Date(),
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

  getMoreMessages: async (
    conversationId: string,
    lastVisibleDoc: DocumentSnapshot,
    limitCount: number,
    joinedAt?: Date,
  ): Promise<{ messages: Message[]; lastDoc: DocumentSnapshot | null; hasMore: boolean }> => {
    try {
      let q = query(
        collection(db, "messages"),
        where("conversationId", "==", conversationId),
        orderBy("createdAt", "desc"),
        startAfter(lastVisibleDoc),
        limit(limitCount + 1),
      );

      if (joinedAt) {
        q = query(
          collection(db, "messages"),
          where("conversationId", "==", conversationId),
          where("createdAt", ">=", joinedAt),
          orderBy("createdAt", "desc"),
          startAfter(lastVisibleDoc),
          limit(limitCount + 1),
        );
      }

      const snapshot = await getDocs(q);
      const hasMore = snapshot.docs.length > limitCount;
      const docsToProcess = hasMore ? snapshot.docs.slice(0, limitCount) : snapshot.docs;

      const messages = docsToProcess
        .map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate() || new Date(),
            deliveredAt: data.deliveredAt?.toDate(),
            readBy: data.readBy || [],
            deliveredTo: data.deliveredTo || [],
            mentions: data.mentions || [],
          };
        })
        .reverse() as Message[];

      const lastDoc = docsToProcess[docsToProcess.length - 1] || null;
      return { messages, lastDoc, hasMore };
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
      const messageData: Omit<Message, 'id'> = {
        conversationId,
        senderId,
        content,
        type: MessageType.TEXT,
        createdAt: serverTimestamp() as unknown as Date,
        readBy: [senderId],
        deliveredTo: [senderId],
        deliveredAt: serverTimestamp() as unknown as Date,
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
            createdAt: new Date(),
            id: docRef.id,
          },
          unreadCount,
          updatedAt: serverTimestamp(),
          deletedBy: []
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
      await createAndSendMediaMessage(conversationId, senderId, file, MessageType.IMAGE, {
        replyToId,
        onProgress,
        compress: true,
        displayContent: "Hình ảnh"
      });
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
      await createAndSendMediaMessage(conversationId, senderId, file, MessageType.FILE, {
        replyToId,
        onProgress,
        displayContent: file.name
      });
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
      await createAndSendMediaMessage(conversationId, senderId, file, MessageType.VIDEO, {
        replyToId,
        onProgress,
        displayContent: "Video"
      });
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
      await createAndSendMediaMessage(conversationId, senderId, file, MessageType.VOICE, {
        replyToId,
        onProgress,
        displayContent: "Tin nhắn thoại"
      });
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
          const updates: DocumentData = {
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
        const updates: DocumentData = {
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
    currentUserId: string,
  ): Promise<void> => {
    try {
      const messageRef = doc(db, "messages", messageId);
      const messageSnap = await getDoc(messageRef);
      if (!messageSnap.exists()) throw new Error("Tin nhắn không tồn tại");
      if (messageSnap.data().senderId !== currentUserId) {
        throw new Error("Chỉ người gửi mới được thu hồi tin nhắn");
      }

      await updateDoc(messageRef, {
        isRecalled: true,
        recalledAt: serverTimestamp(),
        content: "Tin nhắn đã được thu hồi",
      });

      const conversationRef = doc(db, "conversations", conversationId);
      await updateDoc(conversationRef, {
        "lastMessage.content": "Tin nhắn đã được thu hồi",
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
  editMessage: async (messageId: string, newContent: string, currentUserId: string): Promise<void> => {
    try {
      const messageRef = doc(db, "messages", messageId);
      const messageSnap = await getDoc(messageRef);

      if (!messageSnap.exists()) throw new Error("Tin nhắn không tồn tại");

      const data = messageSnap.data();
      if (data.senderId !== currentUserId) {
        throw new Error("Chỉ người gửi mới được chỉnh sửa tin nhắn");
      }

      const createdAt = data.createdAt?.toDate();

      if (createdAt) {
        const now = new Date();
        const diffInMinutes = now.getTime() - createdAt.getTime();

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
      const messageData: Partial<Message> = {
        conversationId: targetConversationId,
        senderId,
        content: originalMessage.content,
        type: originalMessage.type,
        createdAt: serverTimestamp() as unknown as Date,
        readBy: [senderId],
        deliveredTo: [senderId],
        deliveredAt: serverTimestamp() as unknown as Date,
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
        if (originalMessage.type === MessageType.IMAGE)
          lastMessageContent = "Hình ảnh";
        else if (originalMessage.type === MessageType.FILE)
          lastMessageContent = originalMessage.fileName || "Tài liệu";
        else if (originalMessage.type === MessageType.VIDEO)
          lastMessageContent = "Video";
        else if (originalMessage.type === MessageType.VOICE)
          lastMessageContent = "Tin nhắn thoại";

        await updateDoc(conversationRef, {
          lastMessage: {
            ...messageData,
            createdAt: new Date(),
            content: lastMessageContent,
          },
          unreadCount,
          updatedAt: serverTimestamp(),
          deletedBy: []
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
        type: MessageType.TEXT,
        createdAt: serverTimestamp(),
        replyToId,
        readBy: [senderId],
        deliveredTo: [senderId],
        deliveredAt: null,
      };

      const docRef = await addDoc(collection(db, "messages"), messageData);

      await updateConversationAfterMessage(
        conversationId,
        senderId,
        { content, type: MessageType.TEXT, replyToId },
        content,
        docRef.id,
      );
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
        const isRemoving = emoji === 'REMOVE' || currentReaction === emoji;
        
        await updateDoc(messageRef, {
          [`reactions.${userId}`]: isRemoving ? deleteField() : emoji
        });

        if (!isRemoving) {
          const userSnap = await getDoc(doc(db, "users", userId));
          const userName = userSnap.exists() ? userSnap.data().name : "Ai đó";
          const lastName = userName.split(' ').pop();
          
          const conversationRef = doc(db, "conversations", data.conversationId);
          await updateDoc(conversationRef, {
            lastMessage: {
              id: messageId,
              senderId: data.senderId,
              content: `${emoji} ${lastName} đã bày tỏ cảm xúc`,
              type: MessageType.TEXT,
              createdAt: new Date()
            },
            updatedAt: serverTimestamp()
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
        type: MessageType.SYSTEM,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'messages'), messageData);

      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        lastMessage: {
          ...messageData,
          id: docRef.id,
          createdAt: new Date(),
        },
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Lỗi gửi tin nhắn hệ thống:", error);
    }
  },
};
