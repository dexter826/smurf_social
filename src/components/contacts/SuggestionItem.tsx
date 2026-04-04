import React, { useCallback } from 'react';
import { UserPlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserAvatar, Skeleton } from '../ui';
import { User } from '../../../shared/types';

interface SuggestionItemProps {
    user: User;
    onAddFriend: (userId: string) => void;
    onDismiss: (userId: string) => void;
    isSending?: boolean;
}

const SuggestionItemInner: React.FC<SuggestionItemProps> = ({
    user,
    onAddFriend,
    onDismiss,
    isSending,
}) => {
    const navigate = useNavigate();

    const handleAdd = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onAddFriend(user.id);
        },
        [onAddFriend, user.id]
    );

    const handleDismiss = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onDismiss(user.id);
        },
        [onDismiss, user.id]
    );

    return (
        <div className="relative flex items-center justify-between px-4 py-3 border-b border-border-light/60 last:border-0 hover:bg-bg-hover active:bg-bg-active transition-colors duration-200 group">
            <button
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                onClick={() => navigate(`/profile/${user.id}`)}
            >
                <UserAvatar userId={user.id} size="md" />
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{user.fullName}</p>
                    {user.school ? (
                        <p className="text-xs text-text-tertiary truncate">Học tại {user.school}</p>
                    ) : user.location ? (
                        <p className="text-xs text-text-tertiary truncate">Ở {user.location}</p>
                    ) : (
                        <p className="text-xs text-text-tertiary">Có thể bạn quen</p>
                    )}
                </div>
            </button>

            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                <button
                    onClick={handleAdd}
                    disabled={isSending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 active:bg-primary/30 transition-colors duration-200 disabled:opacity-50"
                >
                    <UserPlus size={13} />
                    Kết bạn
                </button>
                <button
                    onClick={handleDismiss}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-text-tertiary hover:bg-bg-hover hover:text-text-secondary transition-colors duration-200"
                    aria-label="Bỏ qua gợi ý"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

const SuggestionItemSkeleton: React.FC = () => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border-light/60 last:border-0">
        <div className="flex items-center gap-3 flex-1">
            <Skeleton variant="circle" width={40} height={40} />
            <div className="space-y-1.5">
                <Skeleton variant="line" width={130} height={13} />
                <Skeleton variant="line" width={80} height={11} className="opacity-60" />
            </div>
        </div>
        <div className="flex gap-1.5">
            <Skeleton variant="rect" width={72} height={30} className="rounded-lg" />
            <Skeleton variant="rect" width={28} height={28} className="rounded-lg opacity-40" />
        </div>
    </div>
);

export const SuggestionItem = Object.assign(
    React.memo(SuggestionItemInner),
    { Skeleton: SuggestionItemSkeleton }
) as React.FC<SuggestionItemProps> & { Skeleton: React.FC };
