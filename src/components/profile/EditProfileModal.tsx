import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { Button, Input, Select, DatePicker, Modal } from '../ui';
import { toast } from '../../store/toastStore';

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

  const [provinces, setProvinces] = useState<{ id: string, name: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: user.name,
        bio: user.bio || '',
        location: user.location || '',
        gender: user.gender || 'male',
        birthDate: user.birthDate
      });
      setErrors({});
      fetchProvinces();
    }
  }, [isOpen, user]);

  const fetchProvinces = async () => {
    try {
      const response = await fetch('https://provinces.open-api.vn/api/p/');
      const data = await response.json();
      setProvinces(data.map((p: any) => ({ value: p.name, label: p.name })));
    } catch (error) {
      console.error('Không thể tải danh sách tỉnh/thành phố', error);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Tên không được để trống';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setSaving(true);
    try {
      await onSave(formData);
      toast.success('Cập nhật thông tin thành công!');
      onClose();
    } catch (error) {
      toast.error('Không thể cập nhật thông tin');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chỉnh sửa trang cá nhân"
      maxWidth="2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        
        {/* Thông tin chung */}
        <div>
          <h3 className="font-semibold mb-3 text-text-primary">Thông tin chung</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1 sm:col-span-2">
              <Input
                label="Tên hiển thị *"
                value={formData.name || ''}
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
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value.slice(0, 150) })}
                  placeholder="Viết vài dòng giới thiệu về bản thân..."
                  rows={2}
                  className="w-full px-3 py-2 border border-border-light rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-4 focus:ring-primary-light/30 transition-all resize-none"
                />
                <div className="absolute bottom-2 right-2 text-xs text-text-secondary">
                  {formData.bio?.length || 0}/150
                </div>
              </div>
            </div>

            <div>
              <Input
                label="Email"
                value={user.email || ''}
                disabled
              />
            </div>

            <div>
              <Select
                label="Tỉnh/Thành phố"
                value={formData.location || ''}
                onChange={(val) => setFormData({ ...formData, location: val })}
                options={provinces}
                placeholder="Chọn địa điểm"
              />
            </div>

            <div>
              <Select
                label="Giới tính"
                value={formData.gender || 'male'}
                onChange={(val) => setFormData({ ...formData, gender: val as any })}
                options={[
                  { value: 'male', label: 'Nam' },
                  { value: 'female', label: 'Nữ' },
                  { value: 'other', label: 'Khác' }
                ]}
              />
            </div>

            <div>
              <DatePicker
                label="Ngày sinh"
                value={formData.birthDate}
                onChange={(ts) => setFormData({ ...formData, birthDate: ts })}
                placeholder="Chọn ngày sinh"
              />
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
};
