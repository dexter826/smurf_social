import { useMemo } from 'react';
import { useContactStore } from '../../store/contactStore';

// Source of truth: subcollection users/{uid}/friends qua contactStore
export const useFriendIds = () => {
  const friends = useContactStore(state => state.friends);
  return useMemo(() => friends.map(f => f.id), [friends]);
};
