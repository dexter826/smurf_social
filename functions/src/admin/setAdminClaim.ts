import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { db, auth } from '../app';

// Chỉ superAdmin (set thủ công qua Firebase Console) mới được gọi
export const setAdminClaim = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth?.token.superAdmin) {
      throw new HttpsError('permission-denied', 'Không có quyền superAdmin');
    }

    const { userId, isAdmin } = request.data as { userId: string; isAdmin: boolean };
    if (!userId) throw new HttpsError('invalid-argument', 'Thiếu userId');

    await auth.setCustomUserClaims(userId, { admin: isAdmin || null });

    const configRef = db.collection('config').doc('admins');
    await configRef.set(
      { adminIds: isAdmin ? FieldValue.arrayUnion(userId) : FieldValue.arrayRemove(userId) },
      { merge: true }
    );

    return { success: true };
  }
);
