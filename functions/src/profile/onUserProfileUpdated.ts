import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../app';
import { PostType, Visibility } from '../types';

// Trigger khi user cập nhật avatar hoặc coverImage → tự động tạo post thông báo
export const onUserProfileUpdated = onDocumentUpdated(
  { document: 'users/{userId}', region: 'us-central1' },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const userId = event.params.userId;

    const avatarChanged = before.avatar !== after.avatar && after.avatar;
    const coverChanged = before.coverImage !== after.coverImage && after.coverImage;

    // Bỏ qua nếu không có thay đổi ảnh
    if (!avatarChanged && !coverChanged) return;

    const postType = avatarChanged ? PostType.AVATAR_UPDATE : PostType.COVER_UPDATE;
    const imageField = avatarChanged ? 'avatar' : 'coverImage';
    const newImageUrl: string = after[imageField];

    try {
      await db.collection('posts').add({
        userId,
        content: '',
        images: [newImageUrl],
        videos: [],
        videoThumbnails: {},
        commentCount: 0,
        reactionCount: 0,
        reactionSummary: {},
        visibility: Visibility.PUBLIC,
        type: postType,
        isEdited: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('[onUserProfileUpdated] Lỗi tạo post:', error);
    }
  }
);
