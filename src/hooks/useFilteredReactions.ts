import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ReactionType } from '../../shared/types';
import { useAuthStore } from '../store/authStore';

export const useFilteredReactions = (
  sourceId: string,
  sourceType: 'post' | 'comment',
  authorId: string,
  initialCount?: number
) => {
  const currentUser = useAuthStore(state => state.user);
  const [reactionsMap, setReactionsMap] = useState<Record<string, ReactionType>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!sourceId || !currentUser) return;

    const colPath = sourceType === 'post'
      ? `posts/${sourceId}/reactions`
      : `comments/${sourceId}/reactions`;

    const q = query(collection(db, colPath), orderBy('createdAt', 'desc'));

    setIsLoading(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const map: Record<string, ReactionType> = {};
      snapshot.forEach(doc => {
        map[doc.id] = doc.data().type as ReactionType;
      });
      setReactionsMap(map);
      setIsLoading(false);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        console.error(`Error subscribing to reactions for ${sourceId}:`, error);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [sourceId, sourceType, currentUser?.id]);

  const { filteredSummary, filteredCount, isReacted, currentUserReaction } = useMemo(() => {
    const summary: Partial<Record<ReactionType, number>> = {};
    let count = 0;
    Object.values(reactionsMap).forEach(type => {
      summary[type] = (summary[type] || 0) + 1;
      count++;
    });

    const currentUserReaction = reactionsMap[currentUser?.id || ''] || null;
    const isReacted = !!currentUserReaction;

    let finalCount = initialCount !== undefined ? Math.max(initialCount, count) : count;

    return {
      filteredSummary: summary,
      filteredCount: finalCount,
      isReacted,
      currentUserReaction
    };
  }, [reactionsMap, initialCount, currentUser?.id]);

  return { filteredSummary, filteredCount, reactionsMap, isLoaded: !isLoading, isReacted, currentUserReaction };
};
