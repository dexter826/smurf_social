import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, FriendRequest } from '../types';
import { useAuthStore } from '../store/authStore';
import { useContactStore } from '../store/contactStore';
import { useUserCache } from '../store/userCacheStore';
import { useChatStore } from '../store/chatStore';
import { useLoadingStore } from '../store/loadingStore';

type TabType = 'all' | 'requests' | 'sent';

interface FriendGroup {
  letter: string;
  friends: User[];
}

interface UseContactsReturn {
  currentUser: User | null;
  friends: User[];
  receivedRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  filteredFriends: User[];
  groupedFriends: FriendGroup[];
  userCache: Record<string, User>;
  isLoading: boolean;

  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortOrder: 'asc' | 'desc';
  toggleSortOrder: () => void;

  handleAcceptRequest: (requestId: string, friendId: string) => Promise<void>;
  handleRejectRequest: (requestId: string) => Promise<void>;
  handleCancelRequest: (requestId: string) => Promise<void>;
  handleUnfriend: (friendId: string) => Promise<void>;
  handleBlockUser: (userId: string) => Promise<void>;
  handleMessage: (friendId: string) => Promise<string | null>;
}

export const useContacts = (): UseContactsReturn => {
  const { user: currentUser } = useAuthStore();
  const {
    friends,
    receivedRequests,
    sentRequests,
    subscribeToFriends,
    subscribeToRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    unfriend,
    blockUser
  } = useContactStore();

  const { users: userCache, fetchUsers } = useUserCache();
  const { getOrCreateConversation } = useChatStore();
  const contactsLoading = useLoadingStore(state => state.loadingStates['contacts.friends'] ?? false);

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');


  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToFriends(currentUser.id);
    return () => unsubscribe();
  }, [currentUser?.id, subscribeToFriends]);

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToRequests(currentUser.id);
    return () => unsubscribe();
  }, [currentUser?.id, subscribeToRequests]);

  // Tải info user cho friend request
  useEffect(() => {
    const userIds = [
      ...receivedRequests.map(r => r.senderId),
      ...sentRequests.map(r => r.receiverId)
    ];
    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length > 0) {
      fetchUsers(uniqueIds);
    }
  }, [receivedRequests, sentRequests, fetchUsers]);

  const filteredFriends = useMemo(() => friends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ), [friends, searchTerm]);

  const groupedFriends = useMemo(() => {
    const groups: Record<string, User[]> = {};
    filteredFriends.forEach(friend => {
      const firstLetter = friend.name.charAt(0).toUpperCase();
      if (!groups[firstLetter]) groups[firstLetter] = [];
      groups[firstLetter].push(friend);
    });

    const sortedGroups = Object.keys(groups).sort();
    if (sortOrder === 'desc') sortedGroups.reverse();

    return sortedGroups.map(letter => ({
      letter,
      friends: groups[letter].sort((a, b) => {
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      })
    }));
  }, [filteredFriends, sortOrder]);

  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);
  const handleAcceptRequest = useCallback(async (requestId: string, friendId: string) => {
    if (!currentUser) return;
    await acceptFriendRequest(requestId, currentUser.id, friendId);
  }, [currentUser?.id, acceptFriendRequest]);

  const handleRejectRequest = useCallback(async (requestId: string) => {
    await rejectFriendRequest(requestId);
  }, [rejectFriendRequest]);

  const handleCancelRequest = useCallback(async (requestId: string) => {
    await cancelFriendRequest(requestId);
  }, [cancelFriendRequest]);

  const handleUnfriend = useCallback(async (friendId: string) => {
    if (!currentUser) return;
    await unfriend(currentUser.id, friendId);
  }, [currentUser, unfriend]);

  const handleBlockUser = useCallback(async (userId: string) => {
    if (!currentUser) return;
    await blockUser(currentUser.id, userId);
  }, [currentUser, blockUser]);

  const handleMessage = useCallback(async (friendId: string): Promise<string | null> => {
    if (!currentUser) return null;
    const conversationId = await getOrCreateConversation(currentUser.id, friendId);
    return conversationId;
  }, [currentUser, getOrCreateConversation]);

  return {
    currentUser,
    friends,
    receivedRequests,
    sentRequests,
    filteredFriends,
    groupedFriends,
    userCache,
    isLoading: contactsLoading,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    sortOrder,
    toggleSortOrder,
    handleAcceptRequest,
    handleRejectRequest,
    handleCancelRequest,
    handleUnfriend,
    handleBlockUser,
    handleMessage,
  };
};
