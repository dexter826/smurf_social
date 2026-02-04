import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { User, UserStatus } from '../../types';
import { Avatar } from './Avatar';

interface UserAvatarProps {
  userId: string;
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  initialStatus?: UserStatus;
  className?: string;
  isGroup?: boolean;
  members?: User[];
  showStatus?: boolean;
  onClick?: () => void;
}

import { useAuthStore } from '../../store/authStore';

export const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  src,
  name,
  size,
  initialStatus,
  className,
  isGroup,
  members,
  showStatus = true,
  onClick
}) => {
  const [onlineStatus, setOnlineStatus] = useState<UserStatus | undefined>(initialStatus);
  const [fetchedName, setFetchedName] = useState<string | undefined>(name);
  const currentUser = useAuthStore(state => state.user);

  useEffect(() => {
    if (!userId || isGroup) return;

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data() as User;
        setOnlineStatus(userData.status);
        if (!name) {
          setFetchedName(userData.name);
        }
      }
    });

    return () => unsubscribe();
  }, [userId, isGroup, name]);

  // Kiểm tra quyền xem trạng thái bảo mật
  const canShowStatus = () => {
    if (!showStatus || !onlineStatus || onlineStatus === UserStatus.BANNED) return false;
    if (userId === currentUser?.id) return true;
    
    const isFriend = currentUser?.friendIds?.includes(userId);
    const isBlocked = currentUser?.blockedUserIds?.includes(userId);
    
    return isFriend && !isBlocked;
  };

  const statusToDisplay = canShowStatus() ? onlineStatus : undefined;

  return (
    <Avatar
      src={src}
      name={name || fetchedName}
      size={size}
      status={statusToDisplay}
      className={className}
      isGroup={isGroup}
      members={members}
      onClick={onClick}
    />
  );
};
