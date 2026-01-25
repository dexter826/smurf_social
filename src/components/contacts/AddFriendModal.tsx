import React, { useState } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { Button, Input } from '../ui';
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
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Thêm bạn bè</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Tìm theo tên, email hoặc số điện thoại..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-primary-500" size={32} />
            </div>
          ) : hasSearched && searchResults.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
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
            <div className="text-center py-12 text-gray-400">
              <Search size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Tìm kiếm người dùng</p>
              <p className="text-sm mt-2">Nhập tên, email hoặc số điện thoại để tìm bạn bè mới</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
