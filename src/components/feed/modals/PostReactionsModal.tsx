import React, { useEffect, useState, useMemo } from 'react';
import { Modal, UserAvatar, Skeleton } from '../../ui';
import { User, Post } from '../../../types';
import { batchGetUsers } from '../../../utils/batchUtils';

interface PostReactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reactions: Record<string, string>;
  currentUser: User;
  postAuthorId: string;
}

export const PostReactionsModal: React.FC<PostReactionsModalProps> = ({
  isOpen,
  onClose,
  reactions,
  currentUser,
  postAuthorId
}) => {
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [isLoading, setIsLoading] = useState(true);

  const reactionEntries = useMemo(() => Object.entries(reactions), [reactions]);
  const totalReactions = reactionEntries.length;

  useEffect(() => {
    if (!isOpen || totalReactions === 0) return;

    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const userIds = reactionEntries.map(([userId]) => userId);
        const fetchedUsers = await batchGetUsers(userIds);
        setUsersMap(fetchedUsers);
      } catch (error) {
        console.error('Lỗi khi tải danh sách người dùng thả cảm xúc:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [isOpen, reactionEntries, totalReactions]);

  const { friends, othersCount } = useMemo(() => {
    const friendsList: { user: User; emoji: string }[] = [];
    let others = 0;

    reactionEntries.forEach(([userId, emoji]) => {
      const user = usersMap[userId];
      if (!user) return;

      const isMe = userId === currentUser.id;
      const isAuthor = userId === postAuthorId;
      const isFriend = currentUser.friendIds?.includes(userId);

      // Theo quy tắc: nếu là mình, tác giả, hoặc bạn bè thì hiển thị cụ thể
      if (isMe || isAuthor || isFriend) {
        friendsList.push({ user, emoji });
      } else {
        others++;
      }
    });

    return { friends: friendsList, othersCount: others };
  }, [usersMap, reactionEntries, currentUser.id, currentUser.friendIds, postAuthorId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cảm xúc"
      maxWidth="sm"
      bodyClassName="!p-0"
    >
      <div className="max-h-[60vh] flex flex-col">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton variant="circle" width={40} height={40} />
                <Skeleton variant="line" width={120} height={16} />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-y-auto py-2 custom-scrollbar">
              {friends.length > 0 ? (
                friends.map(({ user, emoji }) => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between px-4 py-3 hover:bg-bg-secondary transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <UserAvatar 
                          userId={user.id} 
                          src={user.avatar} 
                          name={user.name} 
                          size="md" 
                          showStatus={false}
                        />
                        <span className="absolute -bottom-1.5 -right-1.5 text-base">
                          {emoji}
                        </span>
                      </div>
                      <span className="font-semibold text-text-primary text-[15px]">
                        {user.id === currentUser.id ? 'Bạn' : user.name}
                      </span>
                    </div>
                  </div>
                ))
              ) : null}

              {othersCount > 0 && (
                <div className="px-4 py-4 text-center border-t border-border-light bg-bg-secondary/20">
                  <p className="text-sm text-text-secondary font-medium italic">
                    {friends.length > 0 
                      ? `và ${othersCount} người khác đã bày tỏ cảm xúc`
                      : `${othersCount} người đã bày tỏ cảm xúc`}
                  </p>
                  <p className="text-[11px] text-text-tertiary mt-1">
                    (Thông tin chi tiết chỉ hiển thị với bạn bè)
                  </p>
                </div>
              )}

              {totalReactions === 0 && (
                <div className="p-8 text-center text-text-secondary italic">
                  Chưa có cảm xúc nào.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
