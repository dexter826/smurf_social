import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Users, Lock, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { UserAvatar, IconButton, Button, Spinner, Modal, Dropdown, DropdownItem } from '../ui';
import { Post, User } from '../../types';
import { CommentSection } from './CommentSection';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface PostViewModalProps {
  post: Post | null;
  author: User | null;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onLike: (postId: string) => void;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  isLoading?: boolean;
}

export const PostViewModal: React.FC<PostViewModalProps> = ({
  post,
  author,
  currentUser,
  isOpen,
  onClose,
  onLike,
  onEdit,
  onDelete,
  isLoading
}) => {
  const [mediaIndex, setMediaIndex] = useState(0);

  // Reset index khi doi post
  React.useEffect(() => {
    if (isOpen) setMediaIndex(0);
  }, [isOpen, post?.id]);

  if (!isOpen) return null;

  // Hien thi loading state
  if (isLoading || !post) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} showHeader={false} maxWidth="4xl">
        <div className="h-[500px] flex items-center justify-center bg-bg-primary rounded-2xl transition-theme">
          <Spinner size="lg" />
        </div>
      </Modal>
    );
  }

  const allMedia = [
    ...(post.images || []).map(url => ({ url, type: 'image' })),
    ...(post.videos || []).map(url => ({ url, type: 'video' }))
  ];
  
  const isLiked = post.likes.includes(currentUser.id);
  const isOwner = post.userId === currentUser.id;
  const hasMedia = allMedia.length > 0;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      showHeader={false} 
      maxWidth={hasMedia ? "max-w-[75vw]" : "2xl"} 
      padding="none"
      className="!bg-black/98 sm:!bg-transparent"
    >
      <div className={`flex flex-col lg:flex-row h-screen lg:h-[85vh] bg-bg-primary overflow-hidden lg:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] relative transition-all duration-300 ${!hasMedia ? 'lg:max-h-[80vh] w-full' : ''}`}>
        
        {/* Nut dong modal (Cinema Mode only) - REMOVED to avoid overlap */}

        {/* Khong gian Cinema cho Media */}
        {hasMedia && (
          <div className="flex-[1.6] bg-[#050505] flex items-center justify-center relative group min-h-[350px] lg:min-h-0 select-none overflow-hidden">
            {/* Background gradient hieu ung anh sang */}
            <div className={`absolute inset-0 opacity-40 transition-opacity duration-700 ${allMedia[mediaIndex].type === 'image' ? 'bg-[radial-gradient(circle_at_center,_var(--color-primary)_0%,_transparent_70%)]' : ''}`} />
            
            <div className="w-full h-full flex items-center justify-center z-10 p-2 lg:p-6">
               {allMedia[mediaIndex].type === 'video' ? (
                <video 
                  src={allMedia[mediaIndex].url} 
                  controls 
                  className="max-w-full max-h-full rounded-xl shadow-2xl"
                />
              ) : (
                <img 
                  src={allMedia[mediaIndex].url} 
                  alt="" 
                  className="max-w-full max-h-full object-contain rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-500"
                />
              )}

              {/* Nut dieu huong */}
              {allMedia.length > 1 && (
                <>
                  <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
                    <div className={`${mediaIndex === 0 ? 'invisible' : 'visible'}`}>
                      <IconButton
                        onClick={() => setMediaIndex(mediaIndex - 1)}
                        className="bg-white/10 hover:bg-white/20 text-white pointer-events-auto rounded-xl backdrop-blur-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 active:scale-95 w-12 h-14"
                        icon={<ChevronLeft size={32} strokeWidth={1.5} />}
                      />
                    </div>
                    <div className={`${mediaIndex === allMedia.length - 1 ? 'invisible' : 'visible'}`}>
                      <IconButton
                        onClick={() => setMediaIndex(mediaIndex + 1)}
                        className="bg-white/10 hover:bg-white/20 text-white pointer-events-auto rounded-xl backdrop-blur-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 active:scale-95 w-12 h-14"
                        icon={<ChevronRight size={32} strokeWidth={1.5} />}
                      />
                    </div>
                  </div>
                  
                  {/* Bo dem trang */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 text-white px-4 py-1.5 rounded-full text-[11px] font-black backdrop-blur-2xl border border-white/10 tracking-[0.15em] leading-none shadow-xl transform opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {mediaIndex + 1} / {allMedia.length}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Panel noi dung va tuong tac */}
        <div className={`flex flex-col bg-bg-primary h-full transition-theme relative z-10 ${hasMedia ? 'w-full lg:w-[440px] border-l border-border-light' : 'w-full'}`}>
          
          {/* Header thong tin tac gia */}
          <div className="p-4 border-b border-border-light flex items-center justify-between shrink-0 bg-bg-primary sticky top-0 z-30">
            <div className="flex gap-3 items-center">
              <UserAvatar 
                userId={author?.id} 
                src={author?.avatar} 
                name={author?.name} 
                size="md" 
                initialStatus={author?.status} 
              />
              <div>
                <h3 className="font-semibold text-text-primary text-[15px]">
                  {author?.name || 'Unknown User'}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-0.5">
                  <span>
                    {formatDistanceToNow(post.timestamp, {
                      locale: {
                        ...vi,
                        formatDistance: (token, count) => {
                          const formatRelativeLocale: { [key: string]: string } = {
                            lessThanXSeconds: 'vừa xong',
                            xSeconds: 'vừa xong',
                            halfAMinute: 'vừa xong',
                            lessThanXMinutes: '{{count}} phút',
                            xMinutes: '{{count}} phút',
                            aboutXHours: '{{count}} giờ',
                            xHours: '{{count}} giờ',
                            xDays: '{{count}} ngày',
                            aboutXMonths: '{{count}} tháng',
                            xMonths: '{{count}} tháng',
                            aboutXYears: '{{count}} năm',
                            xYears: '{{count}} năm',
                          };
                          return formatRelativeLocale[token].replace('{{count}}', count.toString());
                        }
                      }
                    })}
                  </span>
                  <span>•</span>
                  {post.visibility === 'friends' ? (
                    <Users size={12} title="Bạn bè" />
                  ) : (
                    <Lock size={12} title="Chỉ mình tôi" />
                  )}
                </div>
              </div>
            </div>

            {/* Actions & Nut dong modal */}
            <div className="flex items-center gap-2">
              {isOwner && (
                <Dropdown
                  trigger={<IconButton icon={<MoreHorizontal size={20} />} size="sm" className="text-text-secondary hover:text-text-primary" />}
                  menuClassName="w-48"
                >
                  <DropdownItem
                    icon={<Edit size={16} />}
                    label="Chỉnh sửa"
                    onClick={() => onEdit?.(post.id)}
                  />
                  <DropdownItem
                    icon={<Trash2 size={16} />}
                    label="Xóa bài viết"
                    variant="danger"
                    onClick={() => onDelete?.(post.id)}
                  />
                </Dropdown>
              )}
              
              <IconButton 
                icon={<X size={20} />} 
                onClick={onClose} 
                className="text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-full"
              />
            </div>
          </div>

          {/* Noi dung post va bieu mau binh luan */}
          <CommentSection
            postId={post.id}
            currentUser={currentUser}
            variant="cinema"
            className="flex-1 overflow-y-auto scroll-hide"
            header={
              <div className="flex flex-col">
                {/* Noi dung van ban */}
                <div className="px-4 py-3 pb-2">
                  <p className="text-text-primary whitespace-pre-line text-[15px] leading-relaxed">
                    {post.content}
                  </p>
                </div>

                {/* Thong ke luot thich/binh luan */}
                <div className="px-4 py-3 flex justify-between items-center border-b border-border-light">
                  <div className="flex items-center gap-1.5">
                    {post.likes.length > 0 && (
                      <>
                        <div className="bg-error p-1 rounded-full">
                          <Heart size={12} className="text-white fill-white" />
                        </div>
                        <span className="text-sm text-text-secondary font-medium">
                          {post.likes.length}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-sm text-text-secondary">
                    {post.commentCount > 0 && `${post.commentCount} bình luận`}
                  </div>
                </div>

                {/* Cac nut hanh dong */}
                <div className="flex px-2 py-1 border-b border-border-light">
                  <Button
                    variant="ghost"
                    onClick={() => onLike(post.id)}
                    className={`flex-1 ${
                      isLiked ? '!text-error' : 'text-text-secondary hover:text-error'
                    }`}
                    icon={<Heart size={20} className={isLiked ? 'fill-error text-error' : ''} />}
                  >
                    <span className={`text-sm font-medium ${isLiked ? 'text-error' : ''}`}>Thích</span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 text-text-secondary"
                    icon={<MessageCircle size={20} />}
                  >
                    <span className="text-sm font-medium">Bình luận</span>
                  </Button>
                </div>
              </div>
            }
          />
        </div>
      </div>
    </Modal>
  );
};
