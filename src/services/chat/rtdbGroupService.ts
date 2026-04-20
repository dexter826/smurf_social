import { ref, set, get, update, push, remove } from 'firebase/database';
import { rtdb } from '../../firebase/config';
import { RtdbConversation, RtdbUserChat, MediaObject, MemberRole } from '../../../shared/types';
import { uploadWithProgress, UploadProgress, deleteStorageFile } from '../../utils/uploadUtils';
import { compressImage } from '../../utils/imageUtils';
import { IMAGE_COMPRESSION, GROUP_LIMITS } from '../../constants';
import { validateAvatarFile } from '../../utils/fileValidation';
import { systemMessages } from '../../constants/systemMessages';
import { getRtdbServerTimestamp, getServerSyncedNow } from './chatTime';

export const rtdbGroupService = {
    sendGroupSystemMessage: async (
        convId: string,
        actorId: string,
        content: string
    ): Promise<void> => {
        try {
            const convRef = ref(rtdb, `conversations/${convId}`);
            const convSnap = await get(convRef);
            if (!convSnap.exists()) return;

            const conversation = convSnap.val() as RtdbConversation;
            const memberIds = Object.keys(conversation.members || {});
            const now = getServerSyncedNow();

            const systemMsgRef = push(ref(rtdb, `messages/${convId}`));
            const systemMsgId = systemMsgRef.key!;

            const updates: Record<string, any> = {};
            updates[`messages/${convId}/${systemMsgId}`] = {
                senderId: 'system',
                type: 'system',
                content,
                media: [],
                createdAt: getRtdbServerTimestamp(),
                updatedAt: getRtdbServerTimestamp()
            };

            updates[`conversations/${convId}/lastMessage`] = {
                senderId: 'system',
                content,
                type: 'system',
                timestamp: now,
                messageId: systemMsgId
            };
            updates[`conversations/${convId}/updatedAt`] = getRtdbServerTimestamp();

            memberIds.forEach(uid => {
                updates[`user_chats/${uid}/${convId}/lastMsgTimestamp`] = getRtdbServerTimestamp();
                updates[`user_chats/${uid}/${convId}/updatedAt`] = getRtdbServerTimestamp();
            });

            await update(ref(rtdb), updates);
        } catch (error) {
            console.error('[rtdbGroupService] Lỗi sendGroupSystemMessage:', error);
            throw error;
        }
    },

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

            const members: Record<string, MemberRole> = {};
            members[creatorId] = 'admin';
            memberIds.forEach(id => {
                if (id !== creatorId) {
                    members[id] = 'member';
                }
            });

            const conversationData: any = {
                isGroup: true,
                name,
                avatar: avatar || null,
                creatorId,
                members,
                typing: {},
                lastMessage: null,
                joinApprovalMode: false,
                createdAt: getServerSyncedNow(),
                updatedAt: getServerSyncedNow()
            };

            await set(newConvRef, conversationData);

            const updates: Record<string, any> = {};
            const now = getServerSyncedNow();
            allMemberIds.forEach(uid => {
                updates[`user_chats/${uid}/${convId}`] = {
                    isPinned: false,
                    isMuted: false,
                    isArchived: false,
                    unreadCount: 0,
                    lastReadMsgId: null,
                    lastMsgTimestamp: now,
                    clearedAt: 0,
                    createdAt: now,
                    updatedAt: now
                };
            });

            await update(ref(rtdb), updates);

            return convId;
        } catch (error) {
            console.error('[rtdbGroupService] Lỗi createGroup:', error);
            throw error;
        }
    },

    /** Thêm thành viên trực tiếp (Admin/Creator hoặc Member khi approval mode off) */
    addMembers: async (convId: string, memberIds: string[], actorId: string): Promise<void> => {
        try {
            const convRef = ref(rtdb, `conversations/${convId}`);
            const convSnap = await get(convRef);

            if (!convSnap.exists()) {
                throw new Error('Nhóm không tồn tại');
            }

            const conversation = convSnap.val() as RtdbConversation;
            const currentMemberIds = Object.keys(conversation.members || {});

            if (currentMemberIds.length + memberIds.length > GROUP_LIMITS.MAX_MEMBERS) {
                throw new Error(`Nhóm chỉ được tối đa ${GROUP_LIMITS.MAX_MEMBERS} thành viên`);
            }

            const updates: Record<string, any> = {};
            const now = getServerSyncedNow();

            memberIds.forEach(uid => {
                if (!currentMemberIds.includes(uid)) {
                    updates[`conversations/${convId}/members/${uid}`] = 'member';
                    updates[`user_chats/${uid}/${convId}`] = {
                        isPinned: false,
                        isMuted: false,
                        isArchived: false,
                        unreadCount: 0,
                        lastReadMsgId: null,
                        lastMsgTimestamp: now,
                        clearedAt: now,
                        createdAt: now,
                        updatedAt: now
                    };
                }
            });

            updates[`conversations/${convId}/updatedAt`] = getRtdbServerTimestamp();
            await update(ref(rtdb), updates);
        } catch (error) {
            console.error('[rtdbGroupService] Lỗi addMembers:', error);
            throw error;
        }
    },

    /** Mời thành viên — nếu approval mode bật thì vào pending, tắt thì vào thẳng */
    inviteMember: async (convId: string, uid: string, actorId: string): Promise<'direct' | 'pending'> => {
        try {
            const convRef = ref(rtdb, `conversations/${convId}`);
            const convSnap = await get(convRef);
            if (!convSnap.exists()) throw new Error('Nhóm không tồn tại');

            const conversation = convSnap.val() as RtdbConversation;
            const currentMemberIds = Object.keys(conversation.members || {});

            if (currentMemberIds.includes(uid)) return 'direct';

            const actorRole = conversation.members[actorId];
            const isAdminOrCreator = actorRole === 'admin' || conversation.creatorId === actorId;
            const useApproval = conversation.joinApprovalMode && !isAdminOrCreator;

            if (useApproval) {
                const updates: Record<string, any> = {};
                updates[`conversations/${convId}/pendingMembers/${uid}`] = {
                    addedBy: actorId,
                    timestamp: getServerSyncedNow()
                };
                updates[`conversations/${convId}/updatedAt`] = getRtdbServerTimestamp();
                await update(ref(rtdb), updates);
                return 'pending';
            } else {
                await rtdbGroupService.addMembers(convId, [uid], actorId);
                return 'direct';
            }
        } catch (error) {
            console.error('[rtdbGroupService] Lỗi inviteMember:', error);
            throw error;
        }
    },

    /** Duyệt các thành viên đang chờ */
    approveMembers: async (convId: string, uids: string[]): Promise<void> => {
        try {
            const convRef = ref(rtdb, `conversations/${convId}`);
            const convSnap = await get(convRef);
            if (!convSnap.exists()) throw new Error('Nhóm không tồn tại');

            const now = getServerSyncedNow();
            const updates: Record<string, any> = {};

            uids.forEach(uid => {
                updates[`conversations/${convId}/members/${uid}`] = 'member';
                updates[`conversations/${convId}/pendingMembers/${uid}`] = null;
                updates[`user_chats/${uid}/${convId}`] = {
                    isPinned: false,
                    isMuted: false,
                    isArchived: false,
                    unreadCount: 0,
                    lastReadMsgId: null,
                    lastMsgTimestamp: now,
                    clearedAt: now,
                    createdAt: now,
                    updatedAt: now
                };
            });

            updates[`conversations/${convId}/updatedAt`] = getRtdbServerTimestamp();
            await update(ref(rtdb), updates);
        } catch (error) {
            console.error('[rtdbGroupService] Lỗi approveMembers:', error);
            throw error;
        }
    },

    /** Từ chối thành viên đang chờ */
    rejectMembers: async (convId: string, uids: string[]): Promise<void> => {
        try {
            const updates: Record<string, any> = {};
            uids.forEach(uid => {
                updates[`conversations/${convId}/pendingMembers/${uid}`] = null;
            });
            updates[`conversations/${convId}/updatedAt`] = getRtdbServerTimestamp();
            await update(ref(rtdb), updates);
        } catch (error) {
            console.error('[rtdbGroupService] Lỗi rejectMembers:', error);
            throw error;
        }
    },

    /** Bật/tắt chế độ phê duyệt; tắt thì auto-approve tất cả pending */
    toggleApprovalMode: async (convId: string, enabled: boolean): Promise<string[]> => {
        try {
            const convRef = ref(rtdb, `conversations/${convId}`);
            const convSnap = await get(convRef);
            if (!convSnap.exists()) throw new Error('Nhóm không tồn tại');

            const conversation = convSnap.val() as RtdbConversation;
            const pendingMembers = conversation.pendingMembers || {};
            const pendingUids = Object.keys(pendingMembers);

            const updates: Record<string, any> = {};
            updates[`conversations/${convId}/joinApprovalMode`] = enabled;
            updates[`conversations/${convId}/updatedAt`] = getRtdbServerTimestamp();

            if (!enabled && pendingUids.length > 0) {
                const now = getServerSyncedNow();
                pendingUids.forEach(uid => {
                    updates[`conversations/${convId}/members/${uid}`] = 'member';
                    updates[`conversations/${convId}/pendingMembers/${uid}`] = null;
                    updates[`user_chats/${uid}/${convId}`] = {
                        isPinned: false,
                        isMuted: false,
                        isArchived: false,
                        unreadCount: 0,
                        lastReadMsgId: null,
                        lastMsgTimestamp: now,
                        clearedAt: now,
                        createdAt: now,
                        updatedAt: now
                    };
                });
            }

            await update(ref(rtdb), updates);
            return !enabled ? pendingUids : [];
        } catch (error) {
            console.error('[rtdbGroupService] Lỗi toggleApprovalMode:', error);
            throw error;
        }
    },

    /** Xóa thành viên — Admin không xóa được Admin khác, chỉ Creator mới xóa được Admin */
    removeMember: async (convId: string, uid: string, actorId: string): Promise<void> => {
        try {
            const convRef = ref(rtdb, `conversations/${convId}`);
            const convSnap = await get(convRef);
            if (!convSnap.exists()) throw new Error('Nhóm không tồn tại');

            const conversation = convSnap.val() as RtdbConversation;
            const actorRole = conversation.members[actorId];
            const targetRole = conversation.members[uid];
            const isCreator = conversation.creatorId === actorId;

            if (!isCreator && actorRole !== 'admin') {
                throw new Error('Không có quyền xóa thành viên');
            }
            if (!isCreator && targetRole === 'admin') {
                throw new Error('Admin không thể xóa Admin khác. Chỉ Trưởng nhóm mới có quyền này.');
            }

            const updates: Record<string, any> = {};
            updates[`conversations/${convId}/members/${uid}`] = null;
            updates[`conversations/${convId}/updatedAt`] = getRtdbServerTimestamp();
            updates[`user_chats/${uid}/${convId}`] = null;

            await update(ref(rtdb), updates);
        } catch (error) {
            console.error('[rtdbGroupService] Lỗi removeMember:', error);
            throw error;
        }
    },

    disbandGroup: async (convId: string, actorId: string): Promise<void> => {
        try {
            const convRef = ref(rtdb, `conversations/${convId}`);
            const convSnap = await get(convRef);
            if (!convSnap.exists()) return;

            const conversation = convSnap.val() as RtdbConversation;

            if (conversation.creatorId !== actorId) {
                throw new Error('Chỉ người tạo nhóm mới được quyền giải tán nhóm');
            }

            const now = getServerSyncedNow();
            const updates: Record<string, any> = {};

            updates[`conversations/${convId}/isDisbanded`] = true;
            updates[`conversations/${convId}/updatedAt`] = getRtdbServerTimestamp();
            updates[`messages/${convId}`] = null;

            updates[`conversations/${convId}/lastMessage`] = {
                senderId: 'system',
                content: systemMessages.DISBAND_GROUP(),
                type: 'system',
                timestamp: now,
                messageId: null
            };

            const memberIds = Object.keys(conversation.members || {});

            memberIds.forEach(uid => {
                if (uid === actorId) {
                    updates[`user_chats/${uid}/${convId}`] = null;
                } else {
                    updates[`user_chats/${uid}/${convId}/lastMsgTimestamp`] = getRtdbServerTimestamp();
                    updates[`user_chats/${uid}/${convId}/isArchived`] = false;
                    updates[`user_chats/${uid}/${convId}/updatedAt`] = getRtdbServerTimestamp();
                }
            });

            await update(ref(rtdb), updates);
        } catch (error) {
            console.error('[rtdbGroupService] Lỗi disbandGroup:', error);
            throw error;
        }
    },

    updateGroupInfo: async (
        convId: string,
        updates: { name?: string; avatar?: MediaObject }
    ): Promise<void> => {
        try {
            const convRef = ref(rtdb, `conversations/${convId}`);
            const updateData: any = { ...updates, updatedAt: getRtdbServerTimestamp() };
            await update(convRef, updateData);
        } catch (error) {
            console.error('[rtdbGroupService] Lỗi updateGroupInfo:', error);
            throw error;
        }
    },

    updateMemberRole: async (convId: string, uid: string, role: MemberRole, actorId: string): Promise<void> => {
        try {
            const convRef = ref(rtdb, `conversations/${convId}`);
            const convSnap = await get(convRef);
            if (!convSnap.exists()) throw new Error('Nhóm không tồn tại');

            const conversation = convSnap.val() as RtdbConversation;

            if (conversation.creatorId !== actorId) {
                throw new Error('Chỉ người tạo nhóm mới có quyền thay đổi vai trò thành viên');
            }

            const updates: Record<string, any> = {};
            updates[`conversations/${convId}/members/${uid}`] = role;
            updates[`conversations/${convId}/updatedAt`] = getRtdbServerTimestamp();

            await update(ref(rtdb), updates);
        } catch (error) {
            console.error('[rtdbGroupService] Lỗi updateMemberRole:', error);
            throw error;
        }
    },

    /** Chuyển quyền Trưởng nhóm — Creator cũ trở thành Admin, người mới trở thành Creator */
    transferCreator: async (convId: string, newCreatorId: string, actorId: string): Promise<void> => {
        try {
            const convRef = ref(rtdb, `conversations/${convId}`);
            const convSnap = await get(convRef);
            if (!convSnap.exists()) throw new Error('Nhóm không tồn tại');

            const conversation = convSnap.val() as RtdbConversation;

            if (conversation.creatorId !== actorId) {
                throw new Error('Chỉ Trưởng nhóm mới có thể chuyển quyền');
            }

            const updates: Record<string, any> = {};
            updates[`conversations/${convId}/creatorId`] = newCreatorId;
            // Đảm bảo người mới là admin
            updates[`conversations/${convId}/members/${newCreatorId}`] = 'admin';
            // Creator cũ hạ xuống admin nếu chưa phải
            if (conversation.members[actorId] !== 'admin') {
                updates[`conversations/${convId}/members/${actorId}`] = 'admin';
            }
            updates[`conversations/${convId}/updatedAt`] = getRtdbServerTimestamp();

            await update(ref(rtdb), updates);
        } catch (error) {
            console.error('[rtdbGroupService] Lỗi transferCreator:', error);
            throw error;
        }
    },

    leaveGroup: async (convId: string, uid: string): Promise<void> => {
        try {
            const convRef = ref(rtdb, `conversations/${convId}`);
            const convSnap = await get(convRef);

            if (!convSnap.exists()) {
                throw new Error('Nhóm không tồn tại');
            }

            const conversation = convSnap.val() as RtdbConversation;
            const memberIds = Object.keys(conversation.members || {});
            const updates: Record<string, any> = {};

            if (memberIds.length <= 1) {
                if (conversation.creatorId === uid) {
                    updates[`conversations/${convId}`] = null;
                    updates[`messages/${convId}`] = null;
                    updates[`user_chats/${uid}/${convId}`] = null;
                    await update(ref(rtdb), updates);
                } else {
                    updates[`conversations/${convId}/members/${uid}`] = null;
                    updates[`conversations/${convId}/updatedAt`] = getRtdbServerTimestamp();
                    updates[`user_chats/${uid}/${convId}`] = null;
                    await update(ref(rtdb), updates);
                }
                return;
            }

            if (conversation.creatorId === uid) {
                const admins = memberIds.filter(id => id !== uid && conversation.members[id] === 'admin');
                const newCreatorId = admins.length > 0 ? admins[0] : memberIds.find(id => id !== uid)!;

                updates[`conversations/${convId}/creatorId`] = newCreatorId;
                if (conversation.members[newCreatorId] !== 'admin') {
                    updates[`conversations/${convId}/members/${newCreatorId}`] = 'admin';
                }
            }
            updates[`conversations/${convId}/members/${uid}`] = null;
            updates[`conversations/${convId}/updatedAt`] = getRtdbServerTimestamp();
            updates[`user_chats/${uid}/${convId}`] = null;

            await update(ref(rtdb), updates);
        } catch (error) {
            console.error('[rtdbGroupService] Lỗi leaveGroup:', error);
            throw error;
        }
    },

    uploadGroupAvatar: async (
        conversationId: string,
        file: File,
        onProgress?: (progress: UploadProgress) => void
    ): Promise<MediaObject> => {
        try {
            validateAvatarFile(file);
            const compressedFile = await compressImage(file, IMAGE_COMPRESSION.AVATAR);

            const fileExt = file.name.split('.').pop();
            const fileName = `group_${conversationId}_${Date.now()}.${fileExt}`;
            const path = `group-avatars/${conversationId}/${fileName}`;

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
