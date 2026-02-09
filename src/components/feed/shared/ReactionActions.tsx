import React, { useState } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { Button, ReactionSelector, ReactionDisplay } from '../../ui';
import { REACTION_LABELS } from '../../../constants';

interface ReactionActionsProps {
  postId: string;
  reactions?: Record<string, string>;
  myReaction?: string;
  commentCount?: number;
  onReact: (postId: string, reaction: string) => void;
  onCommentClick?: () => void;
  showStats?: boolean;
}

export const ReactionActions: React.FC<ReactionActionsProps> = ({
  postId,
  reactions,
  myReaction,
  commentCount = 0,
  onReact,
  onCommentClick,
  showStats = true
}) => {
  const [showReactions, setShowReactions] = useState(false);

  return (
    <>
      {showStats && ((reactions && Object.keys(reactions).length > 0) || commentCount > 0) && (
        <div className="px-4 py-1 flex justify-between items-center border-b border-border-light min-h-[40px]">
          <div className="flex items-center gap-1.5">
            <ReactionDisplay reactions={reactions} variant="minimal" />
          </div>
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            {commentCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCommentClick}
                className="hover:underline hover:!bg-transparent text-text-secondary"
              >
                {commentCount} bình luận
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex px-2 py-1 relative">
        <div 
          className="flex-1 relative group/reaction-btn" 
          onMouseLeave={() => setShowReactions(false)}
        >
          {showReactions && (
            <ReactionSelector 
              className="absolute bottom-full left-0 mb-2 ml-4 transform origin-bottom-left"
              onSelect={(emoji) => {
                onReact(postId, emoji);
                setShowReactions(false);
              }}
              onClose={() => setShowReactions(false)}
            />
          )}
          <Button
            variant="ghost"
            className={`w-full group ${myReaction ? 'text-primary' : 'text-text-secondary hover:text-primary'}`}
            onClick={() => onReact(postId, myReaction || '👍')}
            onMouseEnter={() => setShowReactions(true)}
          >
            <div className="flex items-center gap-2 transition-transform active:scale-95">
              {myReaction 
                ? <span className="text-xl animate-in zoom-in spin-in-12 duration-300">{myReaction}</span> 
                : <Heart size={20} className="group-hover:scale-110 transition-transform" />
              }
              <span className={`text-sm font-medium ${myReaction ? `text-${REACTION_LABELS[myReaction]}` : ''}`}>
                {myReaction ? REACTION_LABELS[myReaction] : 'Thích'}
              </span>
            </div>
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={onCommentClick}
          className="flex-1 text-text-secondary hover:text-primary hover:bg-bg-secondary"
          icon={<MessageCircle size={20} />}
        >
          <span className="text-sm font-medium">Bình luận</span>
        </Button>
      </div>
    </>
  );
};
