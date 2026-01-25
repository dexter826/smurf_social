import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { User } from '../../types';
import { Button, Input } from '../ui';

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
        birthDate: user.birthDate,
        location: user.location || '',
        workplace: user.workplace || '',
        education: user.education || ''
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
      <div className="bg-bg-main rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-text-main">Chỉnh sửa trang cá nhân</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">
            
            {/* Thông tin cơ bản */}
            <div>
              <h3 className="font-semibold mb-3 text-text-main">Thông tin cơ bản</h3>
              <div className="space-y-4">
                <div>
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

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Giới thiệu
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Viết vài dòng giới thiệu về bản thân..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-bg-main text-text-main focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Thông tin liên hệ */}
            <div>
              <h3 className="font-semibold mb-3 text-text-main">Thông tin liên hệ</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Email
                  </label>
                  <Input
                    value={user.email}
                    disabled
                    className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                  />
                  <p className="text-xs text-text-secondary mt-1">Email không thể thay đổi</p>
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
              </div>
            </div>

            {/* Thông tin cá nhân */}
            <div>
              <h3 className="font-semibold mb-3 text-text-main">Thông tin cá nhân</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Giới tính
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | 'other' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-bg-main text-text-main focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Địa chỉ
                  </label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Nhập địa chỉ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Nơi làm việc
                  </label>
                  <Input
                    value={formData.workplace}
                    onChange={(e) => setFormData({ ...formData, workplace: e.target.value })}
                    placeholder="Nhập nơi làm việc"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Học vấn
                  </label>
                  <Input
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    placeholder="Nhập trường học"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
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
