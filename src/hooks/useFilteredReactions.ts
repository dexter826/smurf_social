import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ReactionType } from '../types';
import { useAuthStore } from '../store/authStore';
import { useFriendIds } from './utils/useFriendIds';

export const useFilteredReactions = (
  sourceId: string,
  sourceType: 'post' | 'comment',
  authorId: string,
  initialSummary?: Partial<Record<ReactionType, number>>,
  initialCount?: number
) => {
  const currentUser = useAuthStore(state => state.user);
  const friendIds = useFriendIds();
  
  const [reactionsMap, setReactionsMap] = useState<Record<string, string | ReactionType>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  const isOwner = currentUser?.id === authorId;

  useEffect(() => {
    if (!sourceId || !currentUser) return;

    // Nếu là chủ bài viết, không cần filter, dùng summary từ gốc được rồi nhưng BE có thể bị de-sync.
    // Thực tế để chính xác theo Zalo:
    // Chủ bài viết: Thấy TẤT CẢ
    // Khách: Thấy BẠN CHUNG, MÌNH, và CHỦ BÀI VIẾT.
    
    // Do Firebase không hỗ trợ query "WHERE id IN [...]", ta buộc phải tải hết về cho Post/Comment này
    // nếu post không quá lớn.
    const colPath = sourceType === 'post' ? `posts/${sourceId}/reactions` : `comments/${sourceId}/reactions`;
    
    const unsubscribe = onSnapshot(collection(db, colPath), (snap) => {
      const map: Record<string, string> = {};
      snap.forEach(d => {
        const reactorId = d.id;
        // Chủ bài viết được thấy hết. 
        // Khách thì chỉ thấy: bình luận của Guest đó, của chủ bài viết, hoặc bạn bè của Guest đó.
        if (isOwner || reactorId === currentUser.id || reactorId === authorId || friendIds.includes(reactorId)) {
           map[reactorId] = d.data().type;
        }
      });
      setReactionsMap(map);
      setIsLoaded(true);
    }, (error) => {
      console.error("useFilteredReactions error:", error);
    });

    return () => unsubscribe();
  }, [sourceId, sourceType, currentUser, authorId, friendIds, isOwner]);

  const { filteredSummary, filteredCount } = useMemo(() => {
    if (!isLoaded && initialSummary) {
        // Chưa tải xong, nếu là owner có thể tạm trả dữ liệu thô
        return {
            filteredSummary: isOwner ? initialSummary : {},
            filteredCount: isOwner ? (initialCount || 0) : 0
        };
    }

    const summary: Partial<Record<ReactionType, number>> = {};
    let count = 0;
    
    Object.values(reactionsMap).forEach(type => {
      summary[type as ReactionType] = (summary[type as ReactionType] || 0) + 1;
      count++;
    });

    return { filteredSummary: summary, filteredCount: count };
  }, [reactionsMap, isLoaded, initialSummary, initialCount, isOwner]);

  return { filteredSummary, filteredCount, reactionsMap };
};
