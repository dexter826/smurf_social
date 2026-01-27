import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
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
  const [user, setUser] = useState<{ status: UserStatus; lastSeen?: any } | null>(
    initialStatus ? { status: initialStatus } : null
  );

  useEffect(() => {
    if (!userId) return;

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUser({
          status: data.status,
          lastSeen: data.lastSeen?.toDate ? data.lastSeen.toDate() : data.lastSeen
        });
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const getStatusText = () => {
    if (user?.status === UserStatus.ONLINE) return onlineText;
    
    if (user?.lastSeen) {
      const date = user.lastSeen instanceof Date ? user.lastSeen : new Date(user.lastSeen);
      const timeAgo = formatDistanceToNow(date, { addSuffix: true, locale: vi });
      return `Truy cập ${timeAgo}`;
    }
    
    return offlineText;
  };

  return (
    <span className={className}>
      {getStatusText()}
    </span>
  );
};
