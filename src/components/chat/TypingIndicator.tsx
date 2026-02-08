import React from 'react';
import { User } from '../../types';

interface TypingIndicatorProps {
  typingUsers: string[];
  currentUserId: string;
  usersMap: Record<string, User>;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  currentUserId,
  usersMap
}) => {
  const activeTypingUsers = typingUsers.filter(uid => uid !== currentUserId);
  if (activeTypingUsers.length === 0) return null;

  const getLastName = (fullName?: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    return parts[parts.length - 1];
  };

  let typingText = '';
  if (activeTypingUsers.length === 1) {
    const user = usersMap[activeTypingUsers[0]];
    const name = getLastName(user?.name) || 'Ai đó';
    typingText = `${name} đang soạn tin...`;
  } else if (activeTypingUsers.length === 2) {
    const user1 = usersMap[activeTypingUsers[0]];
    const user2 = usersMap[activeTypingUsers[1]];
    const name1 = getLastName(user1?.name) || 'Người dùng';
    const name2 = getLastName(user2?.name) || 'người dùng';
    typingText = `${name1} và ${name2} đang soạn tin...`;
  } else {
    const user1 = usersMap[activeTypingUsers[0]];
    const user2 = usersMap[activeTypingUsers[1]];
    const name1 = getLastName(user1?.name) || 'Người dùng';
    const name2 = getLastName(user2?.name) || 'người dùng';
    const othersCount = activeTypingUsers.length - 2;
    typingText = `${name1}, ${name2} và ${othersCount} người khác đang soạn tin...`;
  }

  return (
    <div className="absolute bottom-2 left-4 z-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <span className="text-xs text-text-tertiary italic flex items-center gap-1">
        {typingText}
      </span>
    </div>
  );
};
