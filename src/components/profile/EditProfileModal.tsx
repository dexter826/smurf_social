import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Timestamp } from 'firebase/firestore';
import { User, Gender } from '../../../shared/types';
import { Button, Input, TextArea, Select, DatePicker, Modal } from '../ui';
import { toDate } from '../../utils/dateUtils';
import { toast } from '../../store/toastStore';
import { API_ENDPOINTS, TOAST_MESSAGES } from '../../constants';
import { profileSchema, ProfileFormValues } from '../../utils/validation';

interface EditProfileModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<User>) => Promise<void>;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  user, isOpen, onClose, onSave,
}) => {
  const [saving, setSaving] = useState(false);
  const [provinces, setProvinces] = useState<{ value: string; label: string }[]>([]);

  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName,
      bio: user.bio || '',
      location: user.location || '',
      gender: user.gender as Gender,
      dob: user.dob ? toDate(user.dob)?.getTime() : undefined,
    },
  });

  const formData = watch();

  useEffect(() => {
    if (!isOpen) return;
    reset({
      fullName: user.fullName,
      bio: user.bio || '',
      location: user.location || '',
      gender: user.gender as Gender,
      dob: user.dob ? toDate(user.dob)?.getTime() : undefined,
    });
    fetch(API_ENDPOINTS.PROVINCES)
      .then(r => r.json())
      .then((data: { name: string }[]) =>
        setProvinces(data.map(p => ({ value: p.name, label: p.name })))
      )
      .catch(() => { /* silent */ });
  }, [isOpen, user, reset]);

  const handleSave = async (data: ProfileFormValues) => {
    setSaving(true);
    try {
      await onSave({
        fullName: data.fullName,
        bio: data.bio,
        location: data.location,
        gender: data.gender,
        dob: data.dob ? Timestamp.fromDate(new Date(data.dob)) : undefined,
      });
      toast.success(TOAST_MESSAGES.PROFILE.UPDATE_SUCCESS);
      onClose();
    } catch {
      toast.error(TOAST_MESSAGES.PROFILE.UPDATE_FAILED);
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
      fullScreen="mobile"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit(handleSave)}
            isLoading={saving}
            disabled={saving || !isDirty}
          >
            Lưu thay đổi
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full name — spans full width */}
          <div className="col-span-1 sm:col-span-2">
            <Input
              label="Tên hiển thị *"
              {...register('fullName')}
              error={errors.fullName?.message}
              placeholder="Nhập họ và tên"
              size="lg"
            />
          </div>

          {/* Bio — spans full width */}
          <div className="col-span-1 sm:col-span-2">
            <TextArea
              label="Giới thiệu"
              {...register('bio')}
              onChange={(e) =>
                setValue('bio', e.target.value.slice(0, 150), { shouldDirty: true })
              }
              error={errors.bio?.message}
              placeholder="Nhập vài dòng giới thiệu về bản thân..."
              rows={2}
              rightElement={
                <div className="text-xs text-text-tertiary pr-2 pb-2 pointer-events-none">
                  {formData.bio?.length || 0}/150
                </div>
              }
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <Input label="Email" value={user.email || ''} disabled size="lg" />
          </div>

          {/* Province */}
          <div>
            <Select
              label="Tỉnh/Thành phố"
              value={formData.location || ''}
              onChange={(val) => setValue('location', val, { shouldDirty: true })}
              options={provinces}
              placeholder="Chọn tỉnh/thành phố"
              size="lg"
            />
          </div>

          {/* Gender */}
          <div>
            <Select
              label="Giới tính"
              value={formData.gender || ''}
              onChange={(val) => setValue('gender', val as Gender, { shouldDirty: true })}
              options={[
                { value: 'male', label: 'Nam' },
                { value: 'female', label: 'Nữ' },
              ]}
              placeholder="Chọn giới tính"
              size="lg"
            />
          </div>

          {/* DOB */}
          <div>
            <DatePicker
              label="Ngày sinh"
              value={formData.dob}
              onChange={(ts) => setValue('dob', ts, { shouldDirty: true })}
              placeholder="Chọn ngày sinh"
              size="lg"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
