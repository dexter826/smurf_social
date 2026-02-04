import React, { useState, useEffect } from 'react';
import { Search, Check, Loader2, UserPlus } from 'lucide-react';
import { User, Conversation } from '../../types';
import { userService } from '../../services/userService';
import { Modal, Input, Button, Avatar, UserAvatar } from '../ui';

interface AddMemberModalProps {
  isOpen: boolean;
  conversation: Conversation;
  currentUserId: string;
  onClose: () => void;
  onAddMembers: (userIds: string[]) => Promise<void>;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  conversation,
  currentUserId,
  onClose,
  onAddMembers
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Thành viên hiện tại trong nhóm
  const existingMemberIds = conversation.participantIds;

  useEffect(() => {
    if (isOpen) {
      loadFriends();
      setSelectedIds([]);
      setSearchTerm('');
    }
  }, [isOpen]);

  const loadFriends = async () => {
    setIsLoading(true);
    try {
      const friendsList = await userService.getAllFriends(currentUserId);
      // Chỉ hiển thị bạn bè chưa có trong nhóm
      const availableFriends = friendsList.filter(
        f => !existingMemberIds.includes(f.id)
      );
      setFriends(availableFriends);
    } catch (error) {
      console.error('Lỗi load friends', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = (userId: string) => {
    setSelectedIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAdd = async () => {
    if (selectedIds.length === 0) return;
    
    setIsAdding(true);
    try {
      await onAddMembers(selectedIds);
      onClose();
    } catch (error) {
      console.error('Lỗi thêm thành viên', error);
    } finally {
      setIsAdding(false);
    }
  };

  const filteredFriends = friends.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm thành viên"
      maxWidth="md"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleAdd}
            disabled={selectedIds.length === 0 || isAdding}
            isLoading={isAdding}
          >
            Thêm ({selectedIds.length})
          </Button>
        </div>
      }
    >
      <div className="flex flex-col min-h-0">
        <div className="flex-none mb-4">
          <Input
            icon={<Search size={16} />}
            placeholder="Tìm bạn bè..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-bg-secondary"
          />
        </div>

        <div className="overflow-y-auto space-y-1 -mr-2 pr-2 custom-scrollbar min-h-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <UserPlus size={40} className="text-text-tertiary mb-3" />
              <p className="text-text-tertiary">
                {searchTerm 
                  ? 'Không tìm thấy bạn bè' 
                  : friends.length === 0 
                    ? 'Tất cả bạn bè đã trong nhóm'
                    : 'Không có bạn bè để thêm'
                }
              </p>
            </div>
          ) : (
            filteredFriends.map(friend => (
              <div
                key={friend.id}
                onClick={() => toggleSelect(friend.id)}
                className={`
                  flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
                  ${selectedIds.includes(friend.id) 
                    ? 'bg-primary-light' 
                    : 'hover:bg-bg-hover'
                  }
                `}
              >
                <UserAvatar 
                  userId={friend.id}
                  src={friend.avatar} 
                  name={friend.name} 
                  size="sm"
                  initialStatus={friend.status}
                />
                <span className="flex-1 text-sm font-medium text-text-primary">
                  {friend.name}
                </span>
                {selectedIds.includes(friend.id) && (
                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
