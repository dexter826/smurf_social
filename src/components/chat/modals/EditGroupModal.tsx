import React, { useState, useRef } from 'react';
import { X, Camera, Loader2, Users } from 'lucide-react';
import { Conversation } from '../../../types';
import { Modal, Input, Button, Avatar, IconButton, ImageCropper } from '../../ui';
import { groupService } from '../../../services/chat/groupService';
import { toast } from '../../../store/toastStore';
import { TOAST_MESSAGES } from '../../../constants';
import { validateFileSize } from '../../../utils';
import { useConversationParticipants } from '../../../hooks/chat/useConversationParticipants';

interface EditGroupModalProps {
  isOpen: boolean;
  conversation: Conversation;
  currentUserId: string;
  onClose: () => void;
  onSave: (updates: { groupName?: string; groupAvatar?: string }) => Promise<void>;
}

export const EditGroupModal: React.FC<EditGroupModalProps> = ({
  isOpen,
  conversation,
  currentUserId,
  onClose,
  onSave
}) => {
  const [groupName, setGroupName] = useState(conversation.groupName || '');
  const [groupAvatar, setGroupAvatar] = useState(conversation.groupAvatar || '');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  const participants = useConversationParticipants(conversation.participantIds);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setGroupName(conversation.groupName || '');
      setGroupAvatar(conversation.groupAvatar || '');
      setPreviewUrl(null);
      setPendingFile(null);
      setShowCropper(false);
      setCropImage(null);
    }
  }, [isOpen, conversation]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFileSize(file, 'AVATAR');
      if (!validation.isValid) {
        if (validation.error) toast.error(validation.error);
        return;
      }
      const url = URL.createObjectURL(file);
      setCropImage(url);
      setShowCropper(true);
    }
    e.target.value = '';
  };

  const handleCropComplete = (croppedFile: File) => {
    const url = URL.createObjectURL(croppedFile);
    setPreviewUrl(url);
    setPendingFile(croppedFile);
    setShowCropper(false);
    if (cropImage) {
      URL.revokeObjectURL(cropImage);
    }
    setCropImage(null);
  };

  const handleCropCancel = () => {
    if (cropImage) {
      URL.revokeObjectURL(cropImage);
    }
    setCropImage(null);
    setShowCropper(false);
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

      // Upload avatar nếu có file mới
      if (pendingFile) {
        const avatarUrl = await groupService.uploadGroupAvatar(conversation.id, pendingFile);
        updates.groupAvatar = avatarUrl;
      }

      await onSave(updates);

      // Cleanup
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      onClose();
    } catch (error) {
      console.error('Lỗi cập nhật group', error);
      toast.error(TOAST_MESSAGES.CHAT.UPDATE_GROUP_FAILED);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = groupName.trim() !== conversation.groupName || previewUrl !== null;

  return (
    <>
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
              <IconButton
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-primary text-white hover:bg-primary-dark shadow-lg"
                icon={<Camera size={16} />}
                size="sm"
              />
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
            {participants.length} thành viên
          </div>
        </div>
      </Modal>

      {/* Image Cropper Modal */}
      {showCropper && cropImage && (
        <ImageCropper
          isOpen={showCropper}
          image={cropImage}
          aspect={1}
          title="Cắt ảnh nhóm"
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
};
