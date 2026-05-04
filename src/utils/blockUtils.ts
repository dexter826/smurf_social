import { BlockOptions, BlockedUserEntry, UserStatus } from '../../shared/types';

export const isFullyBlocked = (options?: BlockOptions): boolean => {
  if (!options) return false;
  return (
    options.blockMessages === true &&
    options.blockCalls === true &&
    options.blockViewMyActivity === true &&
    options.hideTheirActivity === true
  );
};

// Lọc nội dung dựa trên danh sách chặn và BANNED status
export const filterBlockedItems = <T extends { authorId: string }>(
  items: T[],
  blockedUsersMap?: Record<string, BlockedUserEntry>,
  hiddenActivityUserIds?: string[],
  usersMap?: Record<string, { status: string }>
): T[] => {
  return items.filter(item => {
    if (hiddenActivityUserIds && hiddenActivityUserIds.includes(item.authorId)) return false;

    const blockEntry = blockedUsersMap?.[item.authorId];
    if (blockEntry && blockEntry.hideTheirActivity) return false;

    if (usersMap && usersMap[item.authorId]?.status === UserStatus.BANNED) return false;

    return true;
  });
};

// Lọc danh sách user dựa trên danh sách chặn
export const filterBlockedUsers = <T extends { id: string }>(
  users: T[],
  blockedUsersMap: Record<string, BlockedUserEntry>
): T[] => {
  return users.filter(u => !blockedUsersMap[u.id]);
};
