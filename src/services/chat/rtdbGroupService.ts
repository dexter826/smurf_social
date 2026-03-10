import { ref, set, get, update, push, remove } from 'firebase/database';
import { rtdb } from '../../firebase/config';
import { RtdbConversation, RtdbUserChat, MediaObject, MemberRole } from '../../types';
import { uploadWithProgress, UploadProgress, deleteStorageFile } from '../../utils/uploadUtils';
import { compressImage } from '../../utils/imageUtils';
import { IMAGE_COMPRESSION, GROUP_LIMITS } from '../../constants';

export const rtdbGroupService = {
    /**
     * Tạo nhóm mới
     */
    createGroup: async (
        creatorId: string,
        name: string,
        memberIds: string[],
        avatar?: MediaObject
    ): Promise<string> => {
        try {
            const allMemberIds = [creatorId, ...memberIds.filter(id => id !== creatorId)];

            if (allMemberIds.length > GROUP_LIMITS.MAX_MEMBERS) {
                throw new Error(`Nhóm chỉ được tối đa ${GROUP_LIMITS.MAX_MEMBERS} thành viên`);
            }

            const newConvRef = push(ref(rtdb, 'conversations'));
            const convId = newConvRef.key!;

            // Build members object
            const members: Record<string, MemberRole> = {};
            members[creatorId] = 'admin';
            memberIds.forEach(id => {
                if (id !== creatorId) {
                    members[id] = 'member';
                }
            });

            const conversationData: RtdbConversation = {
                isGroup: true,
                name,
                avatar: avatar || null,
                creatorId,
                members,
                lastMessage: null,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            await set(newConvRef, conversationData);

            // Create user_chats entries for all members
            const updates: Record<string, any> = {};
            allMemberIds.forEach(uid => {
                updates[`user_chats/${uid}/${convId}`] = {
                    isPinned: false,
                    isMuted: false,
                    isArchived: false,
                    unreadCount: 0,
                    lastReadMsgId: null,
                    lastMsgTimestamp: Date.now()
                } as RtdbUserChat;
            });

            await update(ref(rtdb), updates);

            return convId;
        } catch (error) {
            console.error('[rtdbGroupService] Lỗi createGroup:', error);
            throw error;
        }
    },

    /**
     * Thêm thành viên vào nhóm
     */
    addMembers: async (convId: string, memberIds: string[]): Promise<void> => {
        try {
            const convRef = ref(rtdb, `conversations/${convId}`);
            const convSnap = await get(convRef);

            if (!convSnap.exists()) {
                throw new Error('Nhóm không tồn tại');
            }

            const conversation = convSnap.val() as RtdbConversation;
            const currentMemberCount = Object.keys(conversation.members || {}).length;

            if (currentMemberCount + memberIds.length > GROUP_LIMITS.MAX_MEMBERS) {
                throw new Error(`Nhóm chỉ được tối đa ${GROUP_LIMITS.MAX_MEMBERS} thành viên`);
            }

            const updates: Record<string, any> = {};

            // Add members to conversation
            memberIds.forEach(uid => {
                updates[`conversations/${convId}/members/${uid}`] = 'member';

                // Create user_chats entry
                updates[`user_chats/${uid}/${convId}`] = {
                    isPinned: false,
                    isMuted: false,
                    isArchived: false,
                    unreadCount: 0,
                    lastReadMsgId: null,
                    lastMsgTimestamp: Date.now()
                } as RtdbUserChat;
            });

            updates[`conversations/${convId}/updatedAt`] = Date.now();

            await update(ref(rtdb), updates);
        } catch (error) {
            console.error('[rtdbGroupService] Lỗi addMembers:', error);
            throw error;
        }
    },

    /**
     * Xóa thành viên khỏi nhóm
     */
    removeMember: async (convId: string, uid: string): Promise<void> => {
        try {
            const updates: Record<string, any> = {};

            // Remove from conversation members
            updates[`conversations/${convId}/members/${uid}`] = null;
            updates[`conversations/${convId}/updatedAt`] = Date.now();

            // Remove user_chats entry
            updates[`user_chats/${uid}/${convId}`] = null;

            await update(ref(rtdb), updates);
        } catch (error) {
            console.error('[rtdbGroupService] Lỗi removeMember:', error);
            throw error;
        }
    },

    /**
     * Cập nhật thông tin nhóm (tên, avatar)
     */
    updateGroupInfo: async (
        convId: string,
        updates: { name?: string; avatar?: MediaObject }
    ): Promise<void> => {
        try {
            const convRef = ref(rtdb, `conversations/${convId}`);
            await update(convRef, {
                ...updates,
                updatedAt: Date.now()
            });
        } catch (error) {
            console.error('[rtdbGroupService] Lỗi updateGroupInfo:', error);
            throw error;
        }
    },

    /**
     * Cập nhật role của thành viên
     */
    updateMemberRole: async (convId: string, uid: string, role: MemberRole): Promise<void> => {
        try {
            const memberRef = ref(rtdb, `conversations/${convId}/members/${uid}`);
            await set(memberRef, role);

            const convRef = ref(rtdb, `conversations/${convId}`);
            await update(convRef, { updatedAt: Date.now() });
        } catch (error) {
            console.error('[rtdbGroupService] Lỗi updateMemberRole:', error);
            throw error;
        }
    },

    /**
     * Rời khỏi nhóm
     */
    leaveGroup: async (convId: string, uid: string): Promise<void> => {
        try {
            const convRef = ref(rtdb, `conversations/${convId}`);
            const convSnap = await get(convRef);

            if (!convSnap.exists()) {
                throw new Error('Nhóm không tồn tại');
            }

            const conversation = convSnap.val() as RtdbConversation;
            const memberIds = Object.keys(conversation.members || {});

            // If only 1 member left, delete conversation
            if (memberIds.length <= 1) {
                await remove(convRef);
                await remove(ref(rtdb, `user_chats/${uid}/${convId}`));
                return;
            }

            // If leaving user is creator, promote another admin or first member
            if (conversation.creatorId === uid) {
                const admins = memberIds.filter(id => id !== uid && conversation.members[id] === 'admin');
                const newCreatorId = admins.length > 0 ? admins[0] : memberIds.find(id => id !== uid)!;

                await update(convRef, {
                    creatorId: newCreatorId,
                    updatedAt: Date.now()
                });

                // Ensure new creator is admin
                if (conversation.members[newCreatorId] !== 'admin') {
                    await set(ref(rtdb, `conversations/${convId}/members/${newCreatorId}`), 'admin');
                }
            }

            // Remove member
            await rtdbGroupService.removeMember(convId, uid);
        } catch (error) {
            console.error('[rtdbGroupService] Lỗi leaveGroup:', error);
            throw error;
        }
    },

    /**
     * Upload group avatar
     */
    uploadGroupAvatar: async (
        conversationId: string,
        file: File,
        onProgress?: (progress: UploadProgress) => void
    ): Promise<MediaObject> => {
        try {
            const compressedFile = await compressImage(file, IMAGE_COMPRESSION.AVATAR);

            const fileExt = file.name.split('.').pop();
            const fileName = `group_${conversationId}_${Date.now()}.${fileExt}`;
            const path = `group-avatars/${conversationId}/${fileName}`;

            // Get old avatar to delete later
            const convRef = ref(rtdb, `conversations/${conversationId}`);
            const convSnap = await get(convRef);
            const oldAvatar = convSnap.exists() ? (convSnap.val() as RtdbConversation).avatar : null;

            const downloadURL = await uploadWithProgress(path, compressedFile, onProgress);

            const mediaObject: MediaObject = {
                url: downloadURL,
                fileName: file.name,
                mimeType: file.type,
                size: file.size,
                isSensitive: false
            };

            // Delete old avatar if exists
            if (oldAvatar?.url) {
                await deleteStorageFile(oldAvatar.url);
            }

            return mediaObject;
        } catch (error) {
            console.error('[rtdbGroupService] Lỗi uploadGroupAvatar:', error);
            throw error;
        }
    }
};
