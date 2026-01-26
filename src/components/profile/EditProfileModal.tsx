import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { User } from '../../types';
import { Button, Input, Select } from '../ui';

interface EditProfileModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<User>) => Promise<void>;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<User>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: user.name,
        bio: user.bio || '',
        phone: user.phone || '',
        gender: user.gender || 'male',
        birthDate: user.birthDate
      });
      setErrors({});
    }
  }, [isOpen, user]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Tên không được để trống';
    }
    
    if (formData.phone && !/^\d{10,11}$/.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ (10-11 số)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      alert('Không thể cập nhật thông tin');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col transition-theme">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-light">
          <h2 className="text-xl font-bold text-text-primary">Chỉnh sửa trang cá nhân</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-hover rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">
            
            {/* Thông tin cơ bản */}
            {/* Thông tin cơ bản & Liên hệ */}
            <div>
              <h3 className="font-semibold mb-3 text-text-primary">Thông tin chung</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Tên hiển thị *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    error={errors.name}
                    placeholder="Nhập tên của bạn"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Giới thiệu
                  </label>
                  <div className="relative">
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value.slice(0, 150) })}
                      placeholder="Viết vài dòng giới thiệu về bản thân..."
                      rows={2}
                      className="w-full px-3 py-2 border border-border-medium rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-text-secondary">
                      {formData.bio?.length || 0}/150
                    </div>
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-text-secondary mb-1">
                    Email
                  </label>
                  <Input
                    value={user.email}
                    disabled
                    className="bg-bg-secondary cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Số điện thoại
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    error={errors.phone}
                    placeholder="Nhập số điện thoại"
                  />
                </div>

                <div>
                  <Select
                    label="Giới tính"
                    value={formData.gender}
                    onChange={(val) => setFormData({ ...formData, gender: val as any })}
                    options={[
                      { value: 'male', label: 'Nam' },
                      { value: 'female', label: 'Nữ' },
                      { value: 'other', label: 'Khác' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Ngày sinh
                  </label>
                  <Input
                    type="date"
                    value={formData.birthDate ? new Date(formData.birthDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value ? new Date(e.target.value).getTime() : undefined })}
                    placeholder="Chọn ngày sinh"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border-light">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>

      </div>
    </div>
  );
};
