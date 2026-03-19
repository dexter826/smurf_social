import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ReactionType } from '../../shared/types';
import { useAuthStore } from '../store/authStore';

export const useFilteredReactions = (
  sourceId: string,
  sourceType: 'post' | 'comment',
  authorId: string
) => {
  const currentUser = useAuthStore(state => state.user);
  const [reactionsMap, setReactionsMap] = useState<Record<string, ReactionType>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!sourceId || !currentUser) return;

    let cancelled = false;
    const colPath = sourceType === 'post'
      ? `posts/${sourceId}/reactions`
      : `comments/${sourceId}/reactions`;

    setIsLoaded(false);
    setReactionsMap({});

    getDocs(collection(db, colPath))
      .then(snap => {
        if (cancelled) return;
        const map: Record<string, ReactionType> = {};
        snap.forEach(d => { map[d.id] = d.data().type; });
        setReactionsMap(map);
      })
      .catch(error => {
        if (cancelled) return;
        if (error.code !== 'permission-denied') {
          console.error('useFilteredReactions error:', error);
        }
        setReactionsMap({});
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });

    return () => { cancelled = true; };
  }, [sourceId, sourceType, currentUser?.id, authorId]);

  const { filteredSummary, filteredCount } = useMemo(() => {
    const summary: Partial<Record<ReactionType, number>> = {};
    let count = 0;
    Object.values(reactionsMap).forEach(type => {
      summary[type] = (summary[type] || 0) + 1;
      count++;
    });
    return { filteredSummary: summary, filteredCount: count };
  }, [reactionsMap]);

  return { filteredSummary, filteredCount, reactionsMap, isLoaded };
};
