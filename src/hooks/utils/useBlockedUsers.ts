import { useMemo, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';

// Quản lý danh sách người dùng bị chặn
export const useBlockedUsers = () => {
  const { user } = useAuthStore();
  
  const blockedUserIds = useMemo(
    () => user?.blockedUserIds || [], 
    [user?.blockedUserIds]
  );
  
  const isBlocked = useCallback(
    (userId: string) => blockedUserIds.includes(userId), 
    [blockedUserIds]
  );
  
  return { blockedUserIds, isBlocked };
};
