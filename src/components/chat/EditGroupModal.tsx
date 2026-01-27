import React, { useState, useRef } from 'react';
import { X, Camera, Loader2, Users } from 'lucide-react';
import { Conversation } from '../../types';
import { Modal, Input, Button, Avatar } from '../ui';

interface EditGroupModalProps {
  isOpen: boolean;
  conversation: Conversation;
  onClose: () => void;
  onSave: (updates: { groupName?: string; groupAvatar?: string }) => Promise<void>;
}

export const EditGroupModal: React.FC<EditGroupModalProps> = ({
  isOpen,
  conversation,
  onClose,
  onSave
}) => {
  const [groupName, setGroupName] = useState(conversation.groupName || '');
  const [groupAvatar, setGroupAvatar] = useState(conversation.groupAvatar || '');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state khi mở modal
  React.useEffect(() => {
    if (isOpen) {
      setGroupName(conversation.groupName || '');
      setGroupAvatar(conversation.groupAvatar || '');
      setPreviewUrl(null);
    }
  }, [isOpen, conversation]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSave = async () => {
    const trimmedName = groupName.trim();
    if (!trimmedName) return;

    setIsSaving(true);
    try {
      const updates: { groupName?: string; groupAvatar?: string } = {};
      
      if (trimmedName !== conversation.groupName) {
        updates.groupName = trimmedName;
      }
      
      // TODO: Upload avatar nếu có file mới
      // Hiện tại chỉ support đổi tên
      
      await onSave(updates);
      onClose();
    } catch (error) {
      console.error('Lỗi cập nhật group', error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = groupName.trim() !== conversation.groupName || previewUrl !== null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chỉnh sửa nhóm"
      maxWidth="sm"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!groupName.trim() || !hasChanges || isSaving}
            isLoading={isSaving}
          >
            Lưu thay đổi
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-primary-light flex items-center justify-center">
              {previewUrl || groupAvatar ? (
                <img 
                  src={previewUrl || groupAvatar} 
                  alt="Group avatar" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users size={40} className="text-primary" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors shadow-lg"
            >
              <Camera size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          <p className="text-xs text-text-tertiary mt-2">
            Nhấn để thay đổi ảnh nhóm
          </p>
        </div>

        {/* Tên nhóm */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Tên nhóm
          </label>
          <Input
            placeholder="Nhập tên nhóm..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="bg-bg-secondary"
          />
        </div>

        {/* Thông tin */}
        <div className="text-center text-sm text-text-tertiary">
          {conversation.participants?.length || 0} thành viên
        </div>
      </div>
    </Modal>
  );
};
