import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button, Input, Loading, Modal } from '../ui';
import { useContactStore } from '../../store/contactStore';
import { useAuthStore } from '../../store/authStore';
import { useLoadingStore } from '../../store/loadingStore';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { searchUsers, clearSearchResults } = useContactStore();
  const isLoading = useLoadingStore(state => state.isLoading('contacts.search'));
  const [searchTerm, setSearchTerm] = useState('');
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async () => {
    if (!currentUser || !searchTerm.trim()) return;
    
    setNotFound(false);
    const results = await searchUsers(searchTerm, currentUser.id);
    
    if (results.length > 0) {
      handleClose();
      navigate(`/profile/${results[0].id}`);
    } else {
      setNotFound(true);
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setNotFound(false);
    clearSearchResults();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Tìm kiếm người dùng"
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Nhập địa chỉ email chính xác..."
            icon={<Search size={18} />}
            containerClassName="flex-1"
            className=""
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setNotFound(false);
            }}
            onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
          />
          <Button
            variant="primary"
            onClick={handleSearch}
            disabled={isLoading || !searchTerm.trim()}
            isLoading={isLoading}
          >
            Tìm
          </Button>
        </div>

        <div className="text-center py-6">
          {isLoading ? (
            <Loading variant="inline" size="lg" />
          ) : notFound ? (
            <div className="text-text-secondary">
              <p className="text-lg font-medium">Không tìm thấy người dùng</p>
              <p className="text-sm mt-2">Vui lòng nhập chính xác địa chỉ email</p>
            </div>
          ) : (
            <div className="text-text-tertiary">
              <Search size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-base font-medium text-text-secondary">Tìm kiếm người dùng</p>
              <p className="text-sm mt-1">Nhập email để tìm và xem trang cá nhân</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
