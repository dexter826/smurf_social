import React, { useEffect, useState } from 'react';
import { Search, Play } from 'lucide-react';
import { Modal, Input, Button, UserAvatar } from '../../ui';
import { Post, Visibility } from '../../../../shared/types';
import { useRtdbChatStore } from '../../../store';
import { toast } from '../../../store/toastStore';
import { TOAST_MESSAGES } from '../../../constants/toastMessages';
import { buildSharedPostPayload, getPostSnippet, getPreviewMedia } from '../../../utils/postShareMessage';
import { useShareTargets } from '../../../hooks/chat';
import { ShareTargetItem } from './ShareTargetItem';

interface SharePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  authorName: string;
  currentUserId: string;
}

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

  const sendSharedPostMessage = useRtdbChatStore(state => state.sendSharedPostMessage);
  const { filteredItems, usersMap } = useShareTargets(currentUserId, searchTerm, isOpen);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedConversationIds(new Set());
      setIsSubmitting(false);
    }
  }, [isOpen]);

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
              <ShareTargetItem
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
