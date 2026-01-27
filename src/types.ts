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
  location?: string;
  gender?: 'male' | 'female' | 'other';
  birthDate?: Date;
  status: UserStatus;
  bio?: string;
  friendIds?: string[];
  blockedUserIds?: string[];
  createdAt?: Date;
  coverImage?: string;
  lastSeen?: Date;
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

export type MessageType = 'text' | 'image' | 'video' | 'file' | 'voice';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  type: MessageType;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  readBy?: string[];
  deliveredAt?: Date;
  reactions?: Record<string, string>;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participants: User[];
  lastMessage?: Message;
  unreadCount: Record<string, number>;
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  creatorId?: string;
  adminIds?: string[];
  updatedAt: Date;
  createdAt: Date;
  pinned?: boolean;
  muted?: boolean;
  archived?: boolean;
  markedUnread?: boolean;
  typingUsers?: string[];
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  parentId?: string;
  content: string;
  timestamp: Date;
  likes?: string[];
  image?: string;
  video?: string;
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  images?: string[];
  videos?: string[];
  likes: string[];
  commentCount: number;
  timestamp: Date;
  visibility: 'friends' | 'private';
  edited?: boolean;
  editedAt?: Date;
}
