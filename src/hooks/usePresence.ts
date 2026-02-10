import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../firebase/config';
import { UserStatus } from '../types';

// Lắng nghe trạng thái hoạt động của một người dùng theo thời gian thực
export const usePresence = (userId: string | undefined, initialStatus?: UserStatus) => {
  const [presence, setPresence] = useState<{ status: UserStatus; lastSeen?: number } | null>(
    initialStatus ? { status: initialStatus } : null
  );

  useEffect(() => {
    if (!userId) return;

    const statusRef = ref(rtdb, `/status/${userId}`);
    return onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        setPresence(snapshot.val());
      }
    });
  }, [userId]);

  return presence;
};
