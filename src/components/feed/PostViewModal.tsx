import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Globe, Users, Lock, MoreHorizontal, Edit, Trash2, Flag } from 'lucide-react';
import { UserAvatar, IconButton, Button, Spinner, Modal, Dropdown, DropdownItem, Skeleton, ReactionSelector, ReactionDisplay } from '../ui';
import { Post, User, ReportType } from '../../types';
import { CommentSection } from './CommentSection';
import { formatRelativeTime, formatDateTime } from '../../utils/dateUtils';
import { useReportStore } from '../../store/reportStore';
import { REACTION_LABELS } from '../../constants';

interface PostViewModalProps {
  post: Post | null;
  author: User | null;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onReact: (postId: string, reaction: string) => void;
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
  onReact,
  onEdit,
  onDelete,
  isLoading
}) => {
  const navigate = useNavigate();
  const { openReportModal } = useReportStore();
  const [mediaIndex, setMediaIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const handleProfileClick = () => {
    if (author?.id) {
      onClose();
      navigate(`/profile/${author.id}`);
    }
  };

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Min swipe distance (pixels)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && post && mediaIndex < (post.images?.length || 0) + (post.videos?.length || 0) - 1) {
      setMediaIndex(prev => prev + 1);
    }
    if (isRightSwipe && mediaIndex > 0) {
      setMediaIndex(prev => prev - 1);
    }
  };

  // Reset trạng thái khi đổi bài viết
  React.useEffect(() => {
    if (isOpen) {
      setMediaIndex(0);
      setIsExpanded(false);
    }
  }, [isOpen, post?.id]);

  if (!isOpen) return null;

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
           <div className="hidden md:flex flex-[1.5] bg-bg-secondary items-center justify-center border-r border-border-light">
              <Skeleton className="w-[80%] aspect-video rounded-lg opacity-20" />
           </div>
           
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
  
  const myReaction = post.reactions?.[currentUser.id];
  const isOwner = post.userId === currentUser.id;
  const hasMedia = allMedia.length > 0;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      showHeader={false} 
      maxWidth={hasMedia ? "6xl" : "lg"} 
      padding="none" 
      className={`!fixed !inset-0 !z-[120] !w-screen !h-[100dvh] !max-w-none !rounded-none !m-0 md:!relative md:!inset-auto md:!w-full md:!z-auto ${hasMedia ? "md:h-[90vh] lg:h-[85vh] xl:h-[88vh]" : "md:max-h-[85vh] md:h-auto"} !rounded-none md:!rounded-[24px] lg:!rounded-[32px] transition-all duration-500`}
      bodyClassName={`!overflow-hidden flex flex-col ${hasMedia ? 'lg:flex-row' : ''}`}
    >

        {/* Khong gian Cinema cho Media (Chỉ hiển thị trên Desktop ở vị trí này) */}
        {hasMedia && (
          <div className="hidden lg:flex flex-[1.6] bg-bg-secondary items-center justify-center relative group select-none overflow-hidden touch-none grow shrink-0 border-r border-border-light">
            <div className="w-full h-full relative z-10">
              {/* Media Content */}
              <div className="w-full h-full flex items-center justify-center bg-black/5">
                {allMedia[mediaIndex].type === 'video' ? (
                  <video 
                    src={allMedia[mediaIndex].url} 
                    controls 
                    className="max-w-full max-h-full object-contain shadow-2xl"
                  />
                ) : (
                  <img 
                    src={allMedia[mediaIndex].url} 
                    alt="" 
                    className="max-w-full max-h-full object-contain animate-in fade-in zoom-in-95 duration-500 shadow-2xl"
                  />
                )}
              </div>

              {/* Overlay Navigation (Desktop) */}
              {allMedia.length > 1 && (
                <>
                  <button
                    onClick={() => setMediaIndex(mediaIndex - 1)}
                    className={`
                      absolute left-4 top-1/2 -translate-y-1/2 z-20
                      w-12 h-12 flex items-center justify-center 
                      bg-bg-primary/30 backdrop-blur-lg text-white 
                      rounded-full border-none outline-none shadow-sm
                      transition-all duration-300 ease-in-out
                      opacity-0 group-hover:opacity-100 will-change-transform
                      active:scale-90
                      ${mediaIndex === 0 ? 'pointer-events-none invisible' : 'pointer-events-auto visible'}
                    `}
                  >
                    <ChevronLeft size={32} strokeWidth={2.5} />
                  </button>

                  <button
                    onClick={() => setMediaIndex(mediaIndex + 1)}
                    className={`
                      absolute right-4 top-1/2 -translate-y-1/2 z-20
                      w-12 h-12 flex items-center justify-center 
                      bg-bg-primary/30 backdrop-blur-lg text-white 
                      rounded-full border-none outline-none shadow-sm
                      transition-all duration-300 ease-in-out
                      opacity-0 group-hover:opacity-100 will-change-transform
                      active:scale-90
                      ${mediaIndex === allMedia.length - 1 ? 'pointer-events-none invisible' : 'pointer-events-auto visible'}
                    `}
                  >
                    <ChevronRight size={32} strokeWidth={2.5} />
                  </button>

                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-bg-primary/40 backdrop-blur-xl text-text-primary px-4 py-1.5 rounded-full text-[13px] font-bold border border-white/10 tracking-widest shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out">
                    {mediaIndex + 1} <span className="mx-1 opacity-50">/</span> {allMedia.length}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Panel noi dung va tuong tac */}
        <div className={`flex flex-col bg-bg-primary h-full transition-theme relative z-10 overflow-hidden ${hasMedia ? 'w-full lg:w-[480px] lg:border-l border-border-light flex-1 lg:flex-none' : 'w-full'}`}>
          
          <div className="p-4 md:p-5 lg:p-6 border-b border-border-light flex items-center justify-between shrink-0 bg-bg-primary/80 backdrop-blur-xl z-30">
            <div className="flex gap-3 items-center flex-1 min-w-0">
              <UserAvatar 
                userId={author?.id} 
                src={author?.avatar} 
                name={author?.name} 
                size="md" 
                initialStatus={author?.status} 
                onClick={handleProfileClick}
              />
              <div className="min-w-0 flex-1">
                <h3 
                  className="font-bold text-text-primary text-[16px] tracking-tight truncate max-w-full cursor-pointer hover:text-primary transition-colors"
                  onClick={handleProfileClick}
                >
                  {author?.name || 'Unknown User'}
                </h3>
                <div className="flex items-center gap-2 text-[12px] text-text-tertiary font-semibold mt-0.5">
                  <span title={formatDateTime(post.timestamp)} className="hover:text-text-secondary transition-colors cursor-default">
                    {formatRelativeTime(post.timestamp)}
                  </span>
                  <span className="opacity-40">•</span>
                  {post.visibility === 'public' ? (
                    <Globe size={13} title="Công khai" strokeWidth={2.5} className="opacity-80" />
                  ) : post.visibility === 'friends' ? (
                    <Users size={13} title="Bạn bè" strokeWidth={2.5} className="opacity-80" />
                  ) : (
                    <Lock size={13} title="Chỉ mình tôi" strokeWidth={2.5} className="opacity-80" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isOwner ? (
                <Dropdown
                  trigger={<IconButton icon={<MoreHorizontal size={22} />} size="md" className="text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all" />}
                  menuClassName="w-52"
                >
                  <DropdownItem icon={<Edit size={18} />} label="Chỉnh sửa bài viết" onClick={() => onEdit?.(post.id)} />
                  <DropdownItem icon={<Trash2 size={18} />} label="Xóa bài viết" variant="danger" onClick={() => onDelete?.(post.id)} />
                </Dropdown>
              ) : (
                <Dropdown
                  trigger={<IconButton icon={<MoreHorizontal size={22} />} size="md" className="text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all" />}
                  menuClassName="w-52"
                >
                  <DropdownItem 
                    icon={<Flag size={18} />} 
                    label="Báo cáo bài viết" 
                    variant="danger" 
                    onClick={() => openReportModal(ReportType.POST, post.id, post.userId)} 
                  />
                </Dropdown>
              )}
              <IconButton 
                icon={<X size={22} />} 
                onClick={onClose} 
                className="text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all" 
              />
            </div>
          </div>

          <CommentSection
            postId={post.id}
            currentUser={currentUser}
            variant="cinema"
            autoFocus={true}
            className="flex-1 min-h-0"
            onProfileClick={onClose}
            postOwnerId={post.userId}
            totalCommentCount={post.commentCount}
            header={
              <div className="flex flex-col">
                {/* Media Component cho Mobile (Nằm giữa Header và Content) */}
                {hasMedia && (
                  <div 
                    className="lg:hidden w-full bg-bg-secondary aspect-square max-h-[50vh] flex items-center justify-center relative select-none overflow-hidden touch-none -mt-0.5 border-b border-border-light shadow-inner"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                  >
                    <div className="w-full h-full flex items-center justify-center pointer-events-none">
                       {allMedia[mediaIndex].type === 'video' ? (
                         <video src={allMedia[mediaIndex].url} controls className="max-w-full max-h-full pointer-events-auto" />
                       ) : (
                         <img src={allMedia[mediaIndex].url} alt="" className="max-w-full max-h-full object-contain" />
                       )}
                    </div>
                    {allMedia.length > 1 && (
                      <>
                        <div className="absolute inset-y-0 left-0 flex items-center px-1">
                           <button onClick={() => setMediaIndex(mediaIndex - 1)} className={`bg-bg-primary/25 backdrop-blur-md text-white rounded-full w-10 h-10 flex items-center justify-center outline-none ${mediaIndex === 0 ? 'invisible' : ''}`}>
                              <ChevronLeft size={28} strokeWidth={2.5} />
                           </button>
                        </div>
                        <div className="absolute inset-y-0 right-0 flex items-center px-1">
                           <button onClick={() => setMediaIndex(mediaIndex + 1)} className={`bg-bg-primary/25 backdrop-blur-md text-white rounded-full w-10 h-10 flex items-center justify-center outline-none ${mediaIndex === allMedia.length - 1 ? 'invisible' : ''}`}>
                              <ChevronRight size={28} strokeWidth={2.5} />
                           </button>
                        </div>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-bg-tertiary text-text-primary px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-border-light shadow-sm">
                           {mediaIndex + 1} / {allMedia.length}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Noi dung van ban */}
                <div className="px-5 md:px-6 py-4 pb-3">
                  <p className="text-text-primary whitespace-pre-line text-[15px] md:text-[16px] leading-[1.6]">
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
                          className="text-primary font-bold cursor-pointer hover:underline ml-1.5 transition-all text-sm tracking-wider"
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
                <div className="px-5 md:px-6 py-4 flex justify-between items-center border-b border-border-light/60">
                  <div className="flex items-center gap-2">
                    <ReactionDisplay reactions={post.reactions} />
                  </div>
                  <div className="text-[13px] text-text-secondary font-medium tracking-tight">
                    {post.commentCount > 0 && `${post.commentCount} bình luận`}
                  </div>
                </div>

                {/* Cac nut hanh dong */}
                <div className="flex px-2 py-1 border-b border-border-light relative">
                  <div 
                      className="flex-1 relative group/reaction-btn" 
                      onMouseLeave={() => setShowReactions(false)}
                  >
                    {showReactions && (
                      <ReactionSelector 
                        className="absolute bottom-full left-0 mb-2 ml-4 transform origin-bottom-left z-50"
                        onSelect={(emoji) => {
                          onReact(post.id, emoji);
                          setShowReactions(false);
                        }}
                        onClose={() => setShowReactions(false)}
                      />
                    )}
                    <Button
                      variant="ghost"
                      className={`w-full group ${myReaction ? 'text-primary' : 'text-text-secondary hover:text-primary'}`}
                      onClick={() => onReact(post.id, myReaction || '👍')}
                      onMouseEnter={() => setShowReactions(true)}
                    >
                      <div className="flex items-center gap-2 transition-transform active:scale-95">
                        {myReaction ? <span className="text-xl animate-in zoom-in spin-in-12 duration-300">{myReaction}</span> : <Heart size={20} className="group-hover:scale-110 transition-transform" />}
                        <span className={`text-sm font-medium ${myReaction ? `text-${REACTION_LABELS[myReaction]}` : ''}`}>
                          {myReaction ? REACTION_LABELS[myReaction] : 'Thích'}
                        </span>
                      </div>
                    </Button>
                  </div>
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
    </Modal>
  );
};
