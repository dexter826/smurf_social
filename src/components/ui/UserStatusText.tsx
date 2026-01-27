import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { User, UserStatus } from '../../types';

interface UserStatusTextProps {
  userId: string;
  className?: string;
  initialStatus?: UserStatus;
  onlineText?: string;
  offlineText?: string;
}

export const UserStatusText: React.FC<UserStatusTextProps> = ({
  userId,
  className = '',
  initialStatus,
  onlineText = 'Đang hoạt động',
  offlineText = 'Không hoạt động'
}) => {
  const [onlineStatus, setOnlineStatus] = useState<UserStatus | undefined>(initialStatus);

  useEffect(() => {
    if (!userId) return;

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data() as User;
        setOnlineStatus(userData.status);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  return (
    <span className={className}>
      {onlineStatus === UserStatus.ONLINE ? onlineText : offlineText}
    </span>
  );
};
