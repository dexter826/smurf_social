export type ThemeMode = 'light' | 'dark';

export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline'
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  birthDate?: Date;
  status: UserStatus;
  bio?: string;
  friendIds?: string[];
  blockedUserIds?: string[];
  createdAt?: Date;
}

export enum FriendRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected'
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type MessageType = 'text' | 'image' | 'video' | 'file' | 'sticker';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  type: MessageType;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  isRead?: boolean;
  reactions?: Record<string, string>;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  updatedAt: Date;
  pinned?: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  images?: string[];
  likes: string[];
  comments: Comment[];
  timestamp: Date;
  visibility: 'public' | 'friends' | 'private';
}
