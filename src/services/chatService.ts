import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  updateDoc, 
  onSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Conversation, Message, MessageType } from '../types';
import { userService } from './userService';

export const chatService = {
  getConversations: async (userId: string): Promise<Conversation[]> => {
    try {
      const q = query(
        collection(db, 'conversations'), 
        where('participantIds', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const conversations = await Promise.all(querySnapshot.docs.map(async (d) => {
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
          lastMessage: data.lastMessage ? {
            ...data.lastMessage,
            timestamp: data.lastMessage.timestamp?.toDate() || new Date()
          } : undefined
        } as Conversation;
      }));
      
      return conversations;
    } catch (error) {
      console.error("Lỗi lấy danh sách hội thoại", error);
      return [];
    }
  },

  getMessages: (conversationId: string, callback: (messages: Message[]) => void) => {
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as Message[];
      callback(messages);
    });
  },

  sendMessage: async (
    conversationId: string, 
    senderId: string, 
    content: string, 
    type: MessageType = 'text'
  ): Promise<void> => {
    try {
      const messageData = {
        conversationId,
        senderId,
        content,
        type,
        timestamp: serverTimestamp(),
        isRead: false
      };

      await addDoc(collection(db, 'messages'), messageData);

      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        lastMessage: messageData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Lỗi gửi tin nhắn", error);
    }
  }
};