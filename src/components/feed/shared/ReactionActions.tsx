import React, { useState } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { Button, ReactionSelector, ReactionDisplay } from '../../ui';
import { ReactionType } from '../../../types';
import { REACTION_LABELS } from '../../../constants';
import { getReactionIcon } from '../../chat/reactions/ReactionIcons';

interface ReactionActionsProps {
  postId: string;
  reactionSummary?: Record<string, number>;
  reactionCount?: number;
  myReaction?: string;
  commentCount?: number;
  onReact: (postId: string, reaction: string) => void;
  onCommentClick?: () => void;
  onViewReactions?: () => void;
  showStats?: boolean;
  showEmptyDivider?: boolean;
  statsClassName?: string;
  actionClassName?: string;
  selectorClassName?: string;
}

export const ReactionActions: React.FC<ReactionActionsProps> = ({
  postId, reactionSummary, reactionCount = 0, myReaction, commentCount = 0,
  onReact, onCommentClick, onViewReactions, showStats = true,
  showEmptyDivider = false, statsClassName, actionClassName, selectorClassName
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const hasStats = reactionCount > 0 || commentCount > 0;

  return (
    <>
      {showStats && (hasStats ? (
        <div className={statsClassName || "px-4 py-1 flex justify-between items-center border-b border-border-light min-h-[40px]"}>
          <div className="flex items-center gap-2">
            <ReactionDisplay reactionSummary={reactionSummary} reactionCount={reactionCount} variant="minimal" onClick={onViewReactions} />
          </div>
          {commentCount > 0 && (
            onCommentClick ? (
              <Button variant="ghost" size="sm" onClick={onCommentClick}
                className="hover:underline hover:!bg-transparent text-text-secondary">
                {commentCount} bình luận
              </Button>
            ) : (
              <span className="text-[13px] text-text-secondary font-medium tracking-tight">
                {commentCount} bình luận
              </span>
            )
          )}
        </div>
      ) : showEmptyDivider ? (
        <div className="h-2 border-b border-border-light" />
      ) : null)}

      <div className={actionClassName || "flex px-2 py-1 relative"}>
        <div className="flex-1 relative group/reaction-btn"
          onMouseLeave={() => setShowReactions(false)}>
          {showReactions && (
            <ReactionSelector
              className={`absolute bottom-full left-0 mb-2 ml-4 transform origin-bottom-left ${selectorClassName || ''}`}
              size="md"
              autoClose={false}
              onSelect={(emoji) => { onReact(postId, emoji); setShowReactions(false); }}
              onClose={() => setShowReactions(false)}
            />
          )}
          <Button variant="ghost"
            className={`w-full min-h-[44px] group ${myReaction ? 'text-primary' : 'text-text-secondary hover:text-primary'}`}
            onClick={() => onReact(postId, myReaction || '👍')}
            onMouseEnter={() => setShowReactions(true)}>
            <div className="flex items-center gap-2">
              {myReaction
                ? <span className="animate-in zoom-in spin-in-12 duration-slow">{getReactionIcon(myReaction as ReactionType, "w-5 h-5", 20)}</span>
                : <Heart size={20} />}
              <span className={`text-sm font-medium ${myReaction ? `text-${REACTION_LABELS[myReaction]}` : ''}`}>
                {myReaction ? REACTION_LABELS[myReaction] : 'Thích'}
              </span>
            </div>
          </Button>
        </div>
        <Button variant="ghost" onClick={onCommentClick}
          className={`flex-1 min-h-[44px] text-text-secondary ${onCommentClick ? 'hover:text-primary hover:bg-bg-hover' : ''}`}
          icon={<MessageCircle size={20} />}>
          <span className="text-sm font-medium">Bình luận</span>
        </Button>
      </div>
    </>
  );
};
