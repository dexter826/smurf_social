import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Button, Input, Loading, Modal } from '../ui';
import { SearchUserItem } from './SearchUserItem';
import { useContactStore } from '../../store/contactStore';
import { useAuthStore } from '../../store/authStore';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({ isOpen, onClose }) => {
  const { user: currentUser } = useAuthStore();
  const { searchResults, isLoading, searchUsers, sendFriendRequest, clearSearchResults } = useContactStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!currentUser || !searchTerm.trim()) return;
    
    setHasSearched(true);
    await searchUsers(searchTerm, currentUser.id);
  };

  const handleSendRequest = async (receiverId: string, message?: string) => {
    if (!currentUser) return;
    
    try {
      await sendFriendRequest(currentUser.id, receiverId, message);
    } catch (error) {
      console.error('Lỗi gửi lời mời kết bạn:', error);
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setHasSearched(false);
    clearSearchResults();
    onClose();
  };

  // Dọn dẹp khi đóng modal
  const onCloseWrapper = () => {
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCloseWrapper}
      title="Thêm bạn bè"
      maxWidth="2xl"
    >
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Nhập chính xác địa chỉ email..."
              icon={<Search size={18} />}
              containerClassName="flex-1"
              className="h-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
            />
            <Button
              variant="primary"
              onClick={handleSearch}
              disabled={isLoading || !searchTerm.trim()}
              isLoading={isLoading}
            >
              Tìm kiếm
            </Button>
          </div>

          <div className="mt-4">
            {isLoading ? (
              <Loading variant="inline" size="lg" className="py-6" />
            ) : hasSearched && searchResults.length === 0 ? (
              <div className="text-center py-6 text-text-secondary">
                <p className="text-lg font-medium">Không tìm thấy người dùng nào</p>
                <p className="text-sm mt-2">Vui lòng nhập chính xác địa chỉ email của người dùng</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map((user) => (
                  <SearchUserItem
                    key={user.id}
                    user={user}
                    onSendRequest={handleSendRequest}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-tertiary">
                <Search size={48} className="mx-auto mb-3 opacity-20" />
                <p className="text-base font-medium text-text-secondary">Tìm kiếm người dùng</p>
                <p className="text-sm mt-1">Nhập chính xác email để tìm bạn bè mới</p>
              </div>
            )}
          </div>
        </div>
    </Modal>
  );
};
