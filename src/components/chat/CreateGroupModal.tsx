import React, { useState, useEffect } from 'react';
import { X, Search, Users, Camera, Check, Loader2, Crown } from 'lucide-react';
import { User } from '../../types';
import { userService } from '../../services/userService';
import { useAuthStore } from '../../store/authStore';
import { Modal, Input, Button, Avatar, UserAvatar, IconButton } from '../ui';

interface CreateGroupModalProps {
  isOpen: boolean;
  currentUserId: string;
  onClose: () => void;
  onCreateGroup: (memberIds: string[], groupName: string, groupAvatar?: string) => Promise<void>;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  currentUserId,
  onClose,
  onCreateGroup
}) => {
  const [step, setStep] = useState<'select' | 'details'>('select');
  const [searchTerm, setSearchTerm] = useState('');
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFriends();
      setStep('select');
      setSelectedIds([]);
      setGroupName('');
      setSearchTerm('');
    }
  }, [isOpen]);

  const loadFriends = async () => {
    setIsLoading(true);
    try {
      const friendsList = await userService.getAllFriends(currentUserId);
      setFriends(friendsList);
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

  const handleNext = () => {
    if (selectedIds.length < 2) return;
    
    // Tự động tạo tên nhóm từ tên thành viên (bao gồm người tạo)
    const { user: currentUser } = useAuthStore.getState();
    const selectedFriends = friends.filter(f => selectedIds.includes(f.id));
    const allNames = [
      currentUser?.name.split(' ')[0] || 'Bạn',
      ...selectedFriends.map(f => f.name.split(' ')[0])
    ];
    const autoName = allNames.join(', ');
    setGroupName(autoName);
    setStep('details');
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedIds.length < 2) return;
    
    setIsCreating(true);
    try {
      await onCreateGroup(selectedIds, groupName.trim());
      onClose();
    } catch (error) {
      console.error('Lỗi tạo group', error);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredFriends = friends.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderSelectStep = () => (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-none mb-4">
        <Input
          icon={<Search size={16} />}
          placeholder="Tìm bạn bè..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-bg-secondary h-11"
        />
      </div>

      {selectedIds.length > 0 && (
        <div className="flex-none flex flex-wrap gap-2 mb-4 p-3 bg-bg-secondary rounded-xl max-h-[120px] overflow-y-auto custom-scrollbar">
          {selectedIds.map(id => {
            const friend = friends.find(f => f.id === id);
            if (!friend) return null;
            return (
              <div 
                key={id}
                className="flex items-center gap-2 bg-primary-light text-primary px-3 py-1.5 rounded-full text-sm"
              >
                <span>{friend.name.split(' ')[0]}</span>
                <IconButton 
                  onClick={() => toggleSelect(id)}
                  className="hover:bg-primary/20"
                  icon={<X size={14} />}
                  size="sm"
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-1 -mr-2 pr-2 custom-scrollbar min-h-0">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        ) : filteredFriends.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary">
            {searchTerm ? 'Không tìm thấy bạn bè' : 'Bạn chưa có bạn bè nào'}
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
  );

  const renderDetailsStep = () => {
    const { user: currentUser } = useAuthStore.getState();
    const totalMembers = selectedIds.length + 1; // +1 cho người tạo
    
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center mb-4">
            <Users size={32} className="text-primary" />
          </div>
          <p className="text-sm text-text-secondary">
            Nhóm với {totalMembers} thành viên (bao gồm bạn)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Tên nhóm
          </label>
          <Input
            placeholder="Nhập tên nhóm..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="bg-bg-secondary h-11"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-text-secondary mb-2">
            Thành viên ({totalMembers})
          </p>
          <div className="flex flex-wrap gap-2">
            {/* Hiển thị người tạo (bạn) */}
            {currentUser && (
              <div className="flex items-center gap-2 bg-primary-light px-3 py-2 rounded-lg border border-primary/30">
                <Avatar src={currentUser.avatar} name={currentUser.name} size="xs" />
                <span className="text-sm text-primary font-medium">{currentUser.name}</span>
                <Crown size={12} className="text-primary" />
              </div>
            )}
            {/* Hiển thị các thành viên đã chọn */}
            {selectedIds.map(id => {
              const friend = friends.find(f => f.id === id);
              if (!friend) return null;
              return (
                <div key={id} className="flex items-center gap-2 bg-bg-secondary px-3 py-2 rounded-lg">
                  <Avatar src={friend.avatar} name={friend.name} size="xs" />
                  <span className="text-sm text-text-primary">{friend.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'select' ? 'Tạo nhóm mới' : 'Thông tin nhóm'}
      maxWidth="md"
      footer={
        <div className="flex gap-3">
          {step === 'details' && (
            <Button
              variant="secondary"
              onClick={() => setStep('select')}
            >
              Quay lại
            </Button>
          )}
          {step === 'select' ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={selectedIds.length < 2}
            >
              Tiếp tục ({selectedIds.length}/2+)
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={!groupName.trim() || isCreating}
              isLoading={isCreating}
            >
              Tạo nhóm
            </Button>
          )}
        </div>
      }
    >
      {step === 'select' ? renderSelectStep() : renderDetailsStep()}
    </Modal>
  );
};
