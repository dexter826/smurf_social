import { useMemo, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';

export const useBlockedUsers = () => {
  const blockedUsers = useAuthStore(state => state.blockedUsers);

  const blockedUserIds = useMemo(() => Object.keys(blockedUsers), [blockedUsers]);

  const isFullyBlocked = useCallback(
    (userId: string) => !!blockedUsers[userId]?.isFullyBlocked,
    [blockedUsers]
  );

  const isMessageBlocked = useCallback(
    (userId: string) => !!blockedUsers[userId]?.isMessageBlocked || !!blockedUsers[userId]?.isFullyBlocked,
    [blockedUsers]
  );

  const isBlocked = useCallback(
    (userId: string) => !!blockedUsers[userId],
    [blockedUsers]
  );

  return { 
    blockedUsers, 
    blockedUserIds, 
    isBlocked,
    isFullyBlocked, 
    isMessageBlocked 
  };
};
