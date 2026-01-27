import React, { useEffect, useState } from 'react';
import { User } from '../../types';
import { userService } from '../../services/userService';
import { Avatar, UserAvatar, Spinner } from '../ui';
import { useNavigate } from 'react-router-dom';

interface FriendsTabProps {
  userId: string;
}

export const FriendsTab: React.FC<FriendsTabProps> = ({ userId }) => {
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadFriends();
  }, [userId]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const friendsList = await userService.getAllFriends(userId);
      setFriends(friendsList);
    } catch (error) {
      console.error("Lỗi load friends", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20">
        <div className="bg-bg-primary rounded-lg shadow-sm border border-border-light p-8 text-center transition-theme">
          <p className="text-text-secondary">Chưa có bạn bè nào</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="bg-bg-primary rounded-lg shadow-sm border border-border-light p-6 transition-theme">
        <h3 className="font-bold text-lg mb-4 text-text-primary">
          Bạn bè <span className="text-text-secondary font-normal">({friends.length})</span>
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {friends.map((friend) => (
            <div
              key={friend.id}
              className="bg-bg-secondary rounded-lg p-3 hover:bg-bg-hover transition-colors cursor-pointer"
              onClick={() => navigate(`/profile/${friend.id}`)}
            >
              <UserAvatar userId={friend.id} src={friend.avatar} size="lg" className="mx-auto mb-2" initialStatus={friend.status} />
              <p className="text-sm font-medium text-text-primary text-center truncate">
                {friend.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
