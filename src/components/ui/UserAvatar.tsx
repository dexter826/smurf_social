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
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  src,
  name,
  size,
  initialStatus,
  className,
  isGroup
}) => {
  const [onlineStatus, setOnlineStatus] = useState<UserStatus | undefined>(initialStatus);

  useEffect(() => {
    if (!userId || isGroup) return;

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data() as User;
        setOnlineStatus(userData.status);
      }
    });

    return () => unsubscribe();
  }, [userId, isGroup]);

  return (
    <Avatar
      src={src}
      name={name}
      size={size}
      status={onlineStatus}
      className={className}
      isGroup={isGroup}
    />
  );
};
