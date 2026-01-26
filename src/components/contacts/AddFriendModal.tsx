import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { Button, Input, Loading } from '../ui';
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

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl transition-theme">
        <div className="flex items-center justify-between p-4 border-b border-divider">
          <h2 className="text-xl font-semibold text-text-primary">Thêm bạn bè</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-bg-hover rounded-full transition-colors text-text-secondary"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-divider">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 text-text-tertiary" size={18} />
              <input
                type="text"
                placeholder="Tìm theo tên, email hoặc số điện thoại..."
                className="w-full pl-10 pr-4 py-2 border border-border-light bg-bg-secondary text-text-primary rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button
              variant="primary"
              onClick={handleSearch}
              disabled={isLoading || !searchTerm.trim()}
              isLoading={isLoading}
            >
              Tìm kiếm
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <Loading variant="inline" size="lg" className="py-12" />
          ) : hasSearched && searchResults.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <p className="text-lg font-medium">Không tìm thấy người dùng nào</p>
              <p className="text-sm mt-2">Hãy thử tìm kiếm với từ khóa khác</p>
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
            <div className="text-center py-16 text-text-tertiary">
              <Search size={64} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium text-text-secondary">Tìm kiếm người dùng</p>
              <p className="text-sm mt-2">Nhập tên, email hoặc số điện thoại để tìm bạn bè mới</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
