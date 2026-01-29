import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Users, Lock, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { UserAvatar, IconButton, Button, Spinner, Modal, Dropdown, DropdownItem, Skeleton } from '../ui';
import { Post, User } from '../../types';
import { CommentSection } from './CommentSection';
import { formatRelativeTime } from '../../utils/dateUtils';

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
  const [isExpanded, setIsExpanded] = useState(false);

  // Reset index khi doi post
  React.useEffect(() => {
    if (isOpen) {
      setMediaIndex(0);
      setIsExpanded(false);
    }
  }, [isOpen, post?.id]);

  if (!isOpen) return null;

  // Hien thi loading state
  if (isLoading || !post) {
    return (
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        showHeader={false} 
        maxWidth="4xl"
        className="!p-0 shadow-none h-full md:h-auto overflow-hidden"
      >
        <div className="flex flex-col md:flex-row h-full md:h-[600px] bg-bg-primary md:rounded-2xl overflow-hidden">
           {/* Fake Media Section */}
           <div className="hidden md:flex flex-[1.5] bg-bg-secondary items-center justify-center border-r border-border-light">
              <Skeleton className="w-[80%] aspect-video rounded-lg opacity-20" />
           </div>
           
           {/* Fake Content Section */}
           <div className="flex-1 p-4 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-4">
                 <Skeleton variant="circle" width={40} height={40} />
                 <div className="space-y-2">
                    <Skeleton width={120} height={16} />
                    <Skeleton width={80} height={12} />
                 </div>
              </div>
              <div className="space-y-2 mb-6">
                 <Skeleton width="100%" height={16} />
                 <Skeleton width="100%" height={16} />
                 <Skeleton width="70%" height={16} />
              </div>
              <div className="mt-auto space-y-4">
                  <div className="flex gap-3">
                     <Skeleton variant="circle" width={32} height={32} />
                     <Skeleton className="flex-1 h-8 rounded-full" />
                  </div>
              </div>
           </div>
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
  const modalClassName = hasMedia
    ? "m-0 md:m-4 md:rounded-3xl shadow-none"
    : "md:max-h-[90vh] shadow-none";
  const containerClassName = hasMedia
    ? "flex flex-col lg:flex-row h-[100dvh] lg:h-[85vh] bg-bg-primary overflow-hidden lg:rounded-3xl relative transition-all duration-300 w-full"
    : "flex flex-col h-[100dvh] md:h-auto md:max-h-[85vh] bg-bg-primary overflow-hidden md:rounded-2xl relative transition-all duration-300 w-full";

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      showHeader={false} 
      maxWidth={hasMedia ? "5xl" : "lg"} 
      padding="none"
      className={modalClassName}
    >
      <div className={containerClassName}>
        
        {/* Nut dong modal (Cinema Mode only) - REMOVED to avoid overlap */}

        {/* Khong gian Cinema cho Media */}
        {hasMedia && (
          <div className="flex-[1.6] bg-bg-secondary flex items-center justify-center relative group min-h-[40vh] max-h-[50vh] lg:min-h-0 lg:max-h-full select-none overflow-hidden touch-none grow lg:grow-[1.6] shrink-0">
            
            {/* Nut dong tren mobile khi co media */}
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 z-50 text-white/50 hover:text-white lg:hidden p-2 bg-black/20 backdrop-blur-md rounded-full"
            >
              <X size={24} />
            </button>

            <div className="w-full h-full flex items-center justify-center z-10 p-2 lg:p-6 pb-8 md:pb-6">
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
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-500"
                />
              )}

              {/* Nut dieu huong */}
              {allMedia.length > 1 && (
                <>
                  <div className="absolute inset-0 flex items-center justify-between px-2 md:px-6 pointer-events-none">
                    <div className={`${mediaIndex === 0 ? 'invisible' : 'visible'}`}>
                      <IconButton
                        onClick={() => setMediaIndex(mediaIndex - 1)}
                        className="bg-bg-primary/80 hover:bg-bg-primary text-text-primary pointer-events-auto rounded-xl backdrop-blur-xl border border-border-light opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all transform active:scale-95 w-10 h-10 md:w-12 md:h-14"
                        icon={<ChevronLeft size={24} strokeWidth={1.5} />}
                      />
                    </div>
                    <div className={`${mediaIndex === allMedia.length - 1 ? 'invisible' : 'visible'}`}>
                      <IconButton
                        onClick={() => setMediaIndex(mediaIndex + 1)}
                        className="bg-bg-primary/80 hover:bg-bg-primary text-text-primary pointer-events-auto rounded-xl backdrop-blur-xl border border-border-light opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all transform active:scale-95 w-10 h-10 md:w-12 md:h-14"
                        icon={<ChevronRight size={24} strokeWidth={1.5} />}
                      />
                    </div>
                  </div>
                  
                  {/* Bo dem trang */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-bg-primary/80 text-text-primary px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[10px] md:text-[11px] font-black backdrop-blur-2xl border border-border-light tracking-[0.15em] leading-none shadow-none transform opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
                    {mediaIndex + 1} / {allMedia.length}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Panel noi dung va tuong tac */}
        <div className={`flex flex-col bg-bg-primary h-full transition-theme relative z-10 ${hasMedia ? 'w-full lg:w-[440px] border-t lg:border-t-0 lg:border-l border-border-light flex-1 lg:flex-none' : 'w-full'}`}>
          
          {/* Header thong tin tac gia */}
          <div className="p-3 md:p-4 border-b border-border-light flex items-center justify-between shrink-0 bg-bg-primary sticky top-0 z-30">
            {/* Nut Back Mobile khi khong co media */}
            {!hasMedia && (
                <button 
                  onClick={onClose} 
                  className="mr-2 md:hidden text-text-secondary hover:text-text-primary"
                >
                   <ChevronLeft size={24} />
                </button>
            )}

            <div className="flex gap-2.5 items-center flex-1 min-w-0">
              <UserAvatar 
                userId={author?.id} 
                src={author?.avatar} 
                name={author?.name} 
                size="md" 
                initialStatus={author?.status} 
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-text-primary text-[15px] truncate max-w-full">
                  {author?.name || 'Unknown User'}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-0.5">
                  <span>
                    {formatRelativeTime(post.timestamp)}
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
            autoFocus={true}
            className="flex-1 overflow-y-auto scroll-hide"
            header={
              <div className="flex flex-col">
                {/* Noi dung van ban */}
                <div className="px-4 py-3 pb-2">
                  <p className="text-text-primary whitespace-pre-line text-[15px] leading-relaxed">
                    {(() => {
                      const threshold = 300;
                      const shouldTruncate = post.content.length > threshold;
                      const displayContent = !shouldTruncate || isExpanded 
                        ? post.content 
                        : post.content.slice(0, threshold) + '...';
                      
                      return (
                        <>
                          {displayContent}
                          {shouldTruncate && (
                            <span 
                              onClick={() => setIsExpanded(!isExpanded)}
                              className="text-text-secondary font-medium cursor-pointer hover:underline ml-1"
                            >
                              {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                            </span>
                          )}
                        </>
                      );
                    })()}
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
