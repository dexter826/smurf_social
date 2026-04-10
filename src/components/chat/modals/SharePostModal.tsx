import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search, Play } from 'lucide-react';
import { Modal, Input, Button, UserAvatar } from '../../ui';
import { Post, RtdbConversation, RtdbUserChat, User, UserStatus, Visibility } from '../../../../shared/types';
import { useRtdbChatStore } from '../../../store';
import { useUserCache } from '../../../store/userCacheStore';
import { useConversationParticipants } from '../../../hooks/chat/useConversationParticipants';
import { useAuthStore } from '../../../store/authStore';
import { toast } from '../../../store/toastStore';
import { TOAST_MESSAGES } from '../../../constants/toastMessages';
import { buildSharedPostPayload, getPostSnippet, getPreviewMedia } from '../../../utils/postShareMessage';
import { friendService } from '../../../services/friendService';
import { PAGINATION } from '../../../constants';
import { getDirectConversationId } from '../../../utils/chatUtils';

interface SharePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  authorName: string;
  currentUserId: string;
}

type ShareableEntry =
  | { type: 'conversation'; id: string; item: { id: string; data: RtdbConversation; userChat: RtdbUserChat } }
  | { type: 'friend'; id: string; item: User };

export const SharePostModal: React.FC<SharePostModalProps> = ({
  isOpen,
  onClose,
  post,
  authorName,
  currentUserId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversationIds, setSelectedConversationIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const conversations = useRtdbChatStore(state => state.conversations);
  const sendSharedPostMessage = useRtdbChatStore(state => state.sendSharedPostMessage);
  const { users: usersMap, fetchUsers } = useUserCache();
  const blockedUsers = useAuthStore(state => state.blockedUsers);
  const [allFriends, setAllFriends] = useState<User[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    const userIds = Array.from(new Set(
      conversations.flatMap(conv => Object.keys(conv.data.members || {}))
    )).filter(id => id !== currentUserId);

    if (userIds.length > 0) {
      fetchUsers(userIds);
    }
  }, [isOpen, conversations, fetchUsers, currentUserId]);

  useEffect(() => {
    if (!isOpen) return;

    const loadFriends = async () => {
      try {
        const friends = await friendService.getAllFriends(currentUserId);
        setAllFriends(friends);
      } catch (error) {
        console.error('Lỗi load friends trong SharePostModal:', error);
      }
    };

    loadFriends();
  }, [isOpen, currentUserId]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedConversationIds(new Set());
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const shareableItems = useMemo(() => {
    const validConvs = conversations.filter(conv => {
      if (conv.data.isDisbanded) return false;
      if (!conv.data.isGroup) {
        const partnerId = Object.keys(conv.data.members).find(id => id !== currentUserId);
        if (!partnerId) return false;
        const isBlockedByMe = blockedUsers[partnerId]?.isFullyBlocked || blockedUsers[partnerId]?.isMessageBlocked;
        if (isBlockedByMe) return false;
        const partner = usersMap[partnerId];
        if (partner?.status === UserStatus.BANNED) return false;
      }
      return true;
    });

    const convItems: ShareableEntry[] = validConvs.map(conv => ({
      type: 'conversation',
      id: conv.id,
      item: conv
    }));

    const existingChatPartnerIds = new Set(
      validConvs
        .filter(c => !c.data.isGroup)
        .map(c => Object.keys(c.data.members).find(id => id !== currentUserId))
        .filter(Boolean)
    );

    const friendItems: ShareableEntry[] = allFriends
      .filter(friend => friend.id !== currentUserId)
      .filter(friend => !existingChatPartnerIds.has(friend.id))
      .filter(friend => {
        const blocked = blockedUsers[friend.id];
        return !blocked?.isFullyBlocked && !blocked?.isMessageBlocked && friend.status !== UserStatus.BANNED;
      })
      .map(friend => ({
        type: 'friend',
        id: getDirectConversationId(currentUserId, friend.id),
        item: friend
      }));

    return [...convItems, ...friendItems];
  }, [conversations, allFriends, currentUserId, blockedUsers, usersMap]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    
    if (!normalizedSearch) {
      return shareableItems.slice(0, PAGINATION.SHARE_MODAL_LIMIT);
    }
    return shareableItems.filter(entry => {
      if (entry.type === 'conversation') {
        const conversation = entry.item.data;
        if (conversation.isGroup) {
          return (conversation.name || '').toLowerCase().includes(normalizedSearch);
        }
        const partnerId = Object.keys(conversation.members).find(id => id !== currentUserId) || '';
        const partnerName = usersMap[partnerId]?.fullName || '';
        return partnerName.toLowerCase().includes(normalizedSearch);
      } else {
        const friend = entry.item;
        return (friend.fullName || '').toLowerCase().includes(normalizedSearch) ||
               (friend.email || '').toLowerCase().includes(normalizedSearch);
      }
    }).slice(0, PAGINATION.SHARE_SEARCH_LIMIT);
  }, [searchTerm, shareableItems, currentUserId, usersMap]);

  const isPrivatePost = post?.visibility === Visibility.PRIVATE;
  const canSubmit = selectedConversationIds.size > 0 && !!post && !isPrivatePost && !isSubmitting;

  const handleToggleConversation = (conversationId: string) => {
    setSelectedConversationIds(prev => {
      const next = new Set(prev);
      if (next.has(conversationId)) {
        next.delete(conversationId);
      } else {
        next.add(conversationId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!post || !canSubmit) return;

    const payload = buildSharedPostPayload(post, authorName);
    const targetIds = Array.from(selectedConversationIds);
    setIsSubmitting(true);

    try {
      const results = await Promise.allSettled(
        targetIds.map(conversationId => sendSharedPostMessage(conversationId, currentUserId, payload))
      );

      const hasSuccess = results.some(result => result.status === 'fulfilled');
      if (hasSuccess) {
        onClose();
      } else {
        toast.error(TOAST_MESSAGES.CHAT.SHARE_POST_FAILED);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chia sẻ vào tin nhắn"
      maxWidth="sm"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button fullWidth onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? 'Đang gửi...' : 'Gửi'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 min-h-0">
        {isPrivatePost ? (
          <div className="rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
            Bài viết riêng tư không thể chia sẻ.
          </div>
        ) : (
          <div className="flex bg-bg-secondary rounded-xl border border-border-light overflow-hidden">
            {/* Media Preview */}
            {(() => {
              const media = post ? getPreviewMedia(post) : {};
              if (!media.url) return null;
              return (
                <div className="relative w-24 h-24 shrink-0 bg-bg-tertiary overflow-hidden border-r border-border-light/50">
                  <img 
                    src={media.url} 
                    alt="" 
                    className="w-full h-full object-cover" 
                  />
                  {media.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/20">
                        <Play size={12} fill="white" className="text-white ml-0.5" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Content Info */}
            <div className="p-3 min-w-0 flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-1.5">
                <UserAvatar 
                  userId={post?.authorId || ''} 
                  name={authorName} 
                  size="2xs" 
                  showStatus={false}
                  className="ring-1 ring-border-light"
                />
                <span className="text-xs font-bold text-text-primary truncate">{authorName}</span>
              </div>
              <p className="text-[11px] text-text-secondary line-clamp-3 leading-relaxed break-all">
                {post ? getPostSnippet(post) : ''}
              </p>
            </div>
          </div>
        )}

        <Input
          icon={<Search size={15} />}
          placeholder="Tìm kiếm người dùng hoặc nhóm..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="bg-bg-secondary"
        />

        <div className="overflow-y-auto scroll-hide min-h-0 max-h-72 space-y-1">
          {filteredItems.length > 0 ? (
            filteredItems.map(entry => (
              <ShareConversationItem
                key={entry.id}
                entry={entry}
                currentUserId={currentUserId}
                usersMap={usersMap}
                selected={selectedConversationIds.has(entry.id)}
                onToggle={() => handleToggleConversation(entry.id)}
              />
            ))
          ) : (
            <div className="py-8 text-center text-sm text-text-tertiary">
              Không tìm thấy kết quả phù hợp
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

interface ShareConversationItemProps {
  entry: ShareableEntry;
  currentUserId: string;
  usersMap: Record<string, User>;
  selected: boolean;
  onToggle: () => void;
}

const ShareConversationItem: React.FC<ShareConversationItemProps> = ({
  entry,
  currentUserId,
  usersMap,
  selected,
  onToggle,
}) => {
  const isGroup = entry.type === 'conversation' && entry.item.data.isGroup;
  
  let partner: User | undefined;
  let title = '';
  let avatarUrl = '';
  let participants: User[] = [];

  if (entry.type === 'conversation') {
    const conv = entry.item.data;
    const partnerId = Object.keys(conv.members).find(uid => uid !== currentUserId) || '';
    partner = usersMap[partnerId];
    title = (isGroup ? conv.name : partner?.fullName) || (isGroup ? 'Nhóm chưa đặt tên' : 'Người dùng');
    avatarUrl = (isGroup ? conv.avatar?.url : partner?.avatar?.url) || '';
  } else {
    partner = entry.item;
    title = partner.fullName || 'Người dùng';
    avatarUrl = partner.avatar?.url || '';
  }

  const participantIds = isGroup && entry.type === 'conversation' ? Object.keys(entry.item.data.members) : [];
  const groupParticipants = useConversationParticipants(participantIds);

  if (entry.type === 'conversation' && !isGroup && partner?.status === UserStatus.BANNED) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors ${
        selected
          ? 'border-primary/40 bg-primary/5'
          : 'border-transparent hover:bg-bg-hover'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
        <UserAvatar
          userId={isGroup ? '' : partner?.id || ''}
          src={avatarUrl}
          name={title}
          size="sm"
          isGroup={isGroup}
          members={groupParticipants}
        />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-text-primary truncate">{title}</span>
          {isGroup && entry.type === 'conversation' && (
            <span className="text-[11px] text-text-tertiary truncate">
              Nhóm • {Object.keys(entry.item.data.members).length} thành viên
            </span>
          )}
          {entry.type === 'friend' && (
            <span className="text-[11px] text-text-tertiary truncate">Bạn bè</span>
          )}
        </div>
      </div>
      <span className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-colors ${selected ? 'border-primary bg-primary text-white' : 'border-border-light bg-bg-primary'}`}>
        {selected && <Check size={13} />}
      </span>
    </button>
  );
};
