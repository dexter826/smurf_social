import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { User, UserStatus } from '../../types';
import { Avatar } from './Avatar';
import { usePresence } from '../../hooks/usePresence';

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

import { useAuthStore } from '../../store/authStore';

export const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  src,
  name,
  size,
  className,
  isGroup,
  members,
  showStatus = true,
  onClick
}) => {
  const presence = usePresence(isGroup ? undefined : userId);
  const [fetchedName, setFetchedName] = useState<string | undefined>(name);
  const currentUser = useAuthStore(state => state.user);

  useEffect(() => {
    if (!userId) return;

    // Lấy thông tin cơ bản từ Firestore
    const userRef = doc(db, 'users', userId);
    const unsubscribeFirestore = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data() as User;
        if (!name) {
          setFetchedName(userData.name);
        }
      }
    });

    return () => unsubscribeFirestore();
  }, [userId, name]);

  // Kiểm tra quyền xem trạng thái bảo mật
  const canShowStatus = () => {
    const status = presence?.status;
    if (!showStatus || !status || status === UserStatus.BANNED) return false;
    if (userId === currentUser?.id) return true;
    
    const isFriend = currentUser?.friendIds?.includes(userId);
    const isBlocked = currentUser?.blockedUserIds?.includes(userId);
    
    return isFriend && !isBlocked;
  };

  const statusToDisplay = canShowStatus() ? presence?.status : undefined;

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
