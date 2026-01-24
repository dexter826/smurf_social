import { Conversation, Message, MessageType } from '../types';
import { userService } from './userService';

const MOCK_CHATS: Conversation[] = [
  {
    id: 'c1',
    participants: [], // Populated at runtime
    unreadCount: 2,
    isGroup: false,
    updatedAt: new Date(Date.now() - 1000 * 60 * 5)
  },
  {
    id: 'c2',
    participants: [],
    unreadCount: 0,
    isGroup: false,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2)
  }
];

const MOCK_MESSAGES: Message[] = [
  { id: 'm1', conversationId: 'c1', senderId: 'u1', content: 'Chào Nam, tối nay rảnh không?', timestamp: new Date(Date.now() - 1000 * 60 * 60), type: 'text', isRead: true },
  { id: 'm2', conversationId: 'c1', senderId: 'me', content: 'Chào Hà, mình rảnh nhé. Có vụ gì thế?', timestamp: new Date(Date.now() - 1000 * 60 * 30), type: 'text', isRead: true },
  { id: 'm3', conversationId: 'c1', senderId: 'u1', content: 'Đi cà phê bàn dự án mới đi.', timestamp: new Date(Date.now() - 1000 * 60 * 5), type: 'text', isRead: false },
  
  { id: 'm4', conversationId: 'c2', senderId: 'me', content: 'File thiết kế đây nhé', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), type: 'file', fileName: 'design_v1.fig', fileSize: '12MB', isRead: true },
  { id: 'm5', conversationId: 'c2', senderId: 'u2', content: 'Ok thank you.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), type: 'text', isRead: true },
];

export const chatService = {
  getConversations: async (): Promise<Conversation[]> => {
    // Populate participants and last message dynamically
    const chats = await Promise.all(MOCK_CHATS.map(async (chat) => {
      const allUsers = await userService.getAllFriends();
      const currentUser = await userService.getCurrentUser();
      
      // Simple mock logic to assign participants
      const participants = chat.id === 'c1' 
        ? [allUsers.find(u => u.id === 'u1')!, currentUser] 
        : [allUsers.find(u => u.id === 'u2')!, currentUser];

      const chatMessages = MOCK_MESSAGES.filter(m => m.conversationId === chat.id).sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      return {
        ...chat,
        participants,
        lastMessage: chatMessages[0]
      };
    }));
    return chats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  getMessages: async (conversationId: string): Promise<Message[]> => {
    return MOCK_MESSAGES.filter(m => m.conversationId === conversationId).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  },

  sendMessage: async (conversationId: string, content: string, type: MessageType = 'text'): Promise<Message> => {
    const newMessage: Message = {
      id: Date.now().toString(),
      conversationId,
      senderId: 'me',
      content,
      type,
      timestamp: new Date(),
      isRead: false
    };
    MOCK_MESSAGES.push(newMessage);
    
    // Update conversation timestamp
    const chatIdx = MOCK_CHATS.findIndex(c => c.id === conversationId);
    if(chatIdx > -1) {
      MOCK_CHATS[chatIdx].updatedAt = new Date();
    }

    return newMessage;
  }
};