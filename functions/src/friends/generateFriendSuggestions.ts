import { FieldValue, FieldPath } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../app';
import { User, UserStatus } from '../types';

type UserDoc = User & {
  userVector?: number[];
  suggestedFriends?: string[];
};

type RankedCandidate = {
  id: string;
  user: UserDoc;
  score: number;
};

const DEFAULT_LIMIT = 20;
const ACTIVE_USER_QUERY_LIMIT = 300;

export const generateFriendSuggestions = onCall(
  {
    region: 'asia-south1',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Chưa đăng nhập');
    }

    const userId = request.auth.uid;
    const requestedLimit = Number(request.data?.limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(Math.floor(requestedLimit), 50))
      : DEFAULT_LIMIT;

    try {
      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        throw new HttpsError('not-found', 'Không tìm thấy người dùng');
      }

      const userData = userSnap.data() as UserDoc;
      if (userData.status === UserStatus.BANNED) {
        throw new HttpsError('permission-denied', 'Tài khoản đã bị khóa');
      }

      // Lấy ngẫu nhiên người dùng active
      const randomId = db.collection('users').doc().id;
      let activeUsersSnap = await db.collection('users')
        .where('status', '==', UserStatus.ACTIVE)
        .where(FieldPath.documentId(), '>=', randomId)
        .limit(ACTIVE_USER_QUERY_LIMIT)
        .get();

      if (activeUsersSnap.size < ACTIVE_USER_QUERY_LIMIT) {
        const remainder = ACTIVE_USER_QUERY_LIMIT - activeUsersSnap.size;
        const fallbackSnap = await db.collection('users')
          .where('status', '==', UserStatus.ACTIVE)
          .where(FieldPath.documentId(), '<', randomId)
          .limit(remainder)
          .get();
        
        const mergedDocs = [...activeUsersSnap.docs, ...fallbackSnap.docs];
        activeUsersSnap = { docs: mergedDocs } as FirebaseFirestore.QuerySnapshot;
      }

      const [friendIds, blockedByMeIds, blockedByThemIds] = await Promise.all([
        getFriendIds(userId),
        getBlockedUserIds(userId),
        getBlockedByThemIds(userId)
      ]);

      const myVector = parseVector(userData.userVector);

      const candidates = activeUsersSnap.docs
        .map((doc) => ({ id: doc.id, user: doc.data() as UserDoc }))
        .filter(({ id }) =>
          id !== userId && !friendIds.has(id) && !blockedByMeIds.has(id) && !blockedByThemIds.has(id)
        );

      const ranked = rankCandidates(candidates, myVector, limit * 3);
      const suggestions = ranked.slice(0, limit);
      const suggestionIds = suggestions.map(({ id }) => id);

      // Lưu cache gợi ý
      await userRef.set(
        {
          suggestedFriends: suggestionIds,
          suggestionsLastUpdated: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return {
        userId,
        count: suggestionIds.length,
        suggestionIds,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error('[generateFriendSuggestions] Lỗi:', error);
      throw new HttpsError('internal', 'Không thể tạo gợi ý kết bạn');
    }
  }
);

// Lấy danh sách bạn bè
async function getFriendIds(userId: string): Promise<Set<string>> {
  const snapshot = await db.collection('users').doc(userId).collection('friends').get();
  return new Set(snapshot.docs.map((doc) => doc.id));
}

// Lấy danh sách user bị chặn
async function getBlockedUserIds(userId: string): Promise<Set<string>> {
  const snapshot = await db.collection('users').doc(userId).collection('blockedUsers').get();
  return new Set(snapshot.docs.map((doc) => doc.id));
}

// Lấy danh sách user đã chặn mình
async function getBlockedByThemIds(currentUserId: string): Promise<Set<string>> {
  const blockedDocs = await db.collectionGroup('blockedUsers')
    .where('blockedUid', '==', currentUserId)
    .get();
  
  return new Set(blockedDocs.docs.map((doc) => doc.ref.parent.parent?.id || ''));
}

// Chuẩn hóa vector
function parseVector(raw: unknown): number[] | null {
  if (!Array.isArray(raw)) return null;
  const vector = raw
    .map((v) => (typeof v === 'number' ? v : Number(v)))
    .filter((v) => Number.isFinite(v));
  return vector.length > 0 ? vector : null;
}

// Xếp hạng ứng viên bằng Cosine Similarity
function rankCandidates(
  candidates: Array<{ id: string; user: UserDoc }>,
  myVector: number[] | null,
  limit: number
): RankedCandidate[] {
  if (!myVector || myVector.length === 0) {
    return candidates.slice(0, limit).map(({ id, user }) => ({ id, user, score: 0 }));
  }

  return candidates
    .map(({ id, user }) => ({
      id,
      user,
      score: cosineSimilarity(myVector, parseVector(user.userVector)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Tính độ tương đồng giữa 2 vector
function cosineSimilarity(a: number[], b: number[] | null): number {
  if (!b || a.length === 0 || b.length === 0) return 0;

  const length = Math.min(a.length, b.length);
  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < length; i++) {
    dot += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  return denominator === 0 ? 0 : dot / denominator;
}
