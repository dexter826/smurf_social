import React, { useEffect, useMemo } from 'react';
import { User, UserStatus } from '../../types';
import { Avatar } from './Avatar';
import { usePresence } from '../../hooks/usePresence';
import { useAuthStore } from '../../store/authStore';
import { useContactStore } from '../../store/contactStore';
import { useUserCache } from '../../store/userCacheStore';

interface UserAvatarProps {
  userId: string;
  src?: string;
  name?: string;
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  initialStatus?: UserStatus;
  className?: string;
  isGroup?: boolean;
  members?: User[];
  showStatus?: boolean;
  onClick?: () => void;
}

const UserAvatarInner: React.FC<UserAvatarProps> = ({
  userId,
  src,
  name,
  size,
  className,
  isGroup,
  members,
  initialStatus,
  showStatus = true,
  onClick
}) => {
  const presence = usePresence(isGroup ? undefined : userId, initialStatus);
  const currentUser = useAuthStore(state => state.user);
  const isFriend = useContactStore(state => state.friends.some(f => f.id === userId));
  const cachedUser = useUserCache(state => userId ? state.users[userId] : undefined);
  const fetchUsers = useUserCache(state => state.fetchUsers);

  useEffect(() => {
    if (userId && !name && !cachedUser) {
      fetchUsers([userId]);
    }
  }, [userId, name, cachedUser, fetchUsers]);

  const displayName = name || cachedUser?.name;
  const avatarUrl = src || (userId === currentUser?.id ? currentUser?.avatar : cachedUser?.avatar);

  const statusToDisplay = useMemo(() => {
    const status = presence?.status;
    if (!showStatus || !status || status === UserStatus.BANNED) return undefined;
    if (userId === currentUser?.id) return status;

    const isBlocked = currentUser?.blockedUserIds?.includes(userId);
    // Chỉ hiện status của bạn bè không bị chặn
    return (isFriend && !isBlocked) ? status : undefined;
  }, [presence?.status, showStatus, userId, currentUser?.id, isFriend, currentUser?.blockedUserIds]);

  return (
    <Avatar
      src={avatarUrl}
      name={displayName}
      size={size}
      status={statusToDisplay}
      className={className}
      isGroup={isGroup}
      members={members}
      onClick={onClick}
    />
  );
};

export const UserAvatar = React.memo(UserAvatarInner);
