import { useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';

// Lấy danh sách friendIds của user hiện tại
export const useFriendIds = () => {
  const { user } = useAuthStore();
  return useMemo(() => user?.friendIds || [], [user?.friendIds]);
};
