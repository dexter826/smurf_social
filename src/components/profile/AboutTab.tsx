import React from 'react';
import { Mail, MapPin, Calendar, User as UserIcon } from 'lucide-react';
import { User } from '../../../shared/types';
import { formatDob } from '../../utils/dateUtils';

interface AboutTabProps {
  user: User;
}

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon, label, value,
}) => (
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 flex items-center justify-center bg-bg-secondary rounded-xl flex-shrink-0 text-text-secondary">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs text-text-tertiary font-medium">{label}</p>
      <p className="text-sm text-text-primary font-medium truncate">{value}</p>
    </div>
  </div>
);

export const AboutTab: React.FC<AboutTabProps> = ({ user }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

    {/* Contact info */}
    <div className="bg-bg-primary rounded-2xl border border-border-light p-5 space-y-4">
      <h3 className="font-semibold text-base text-text-primary">Thông tin liên hệ</h3>
      <InfoRow icon={<Mail size={16} />} label="Email" value={user.email} />
      {user.location && (
        <InfoRow icon={<MapPin size={16} />} label="Địa điểm" value={user.location} />
      )}
    </div>

    {/* Basic info */}
    <div className="bg-bg-primary rounded-2xl border border-border-light p-5 space-y-4">
      <h3 className="font-semibold text-base text-text-primary">Thông tin cơ bản</h3>
      <InfoRow
        icon={<UserIcon size={16} />}
        label="Giới tính"
        value={user.gender === 'male' ? 'Nam' : user.gender === 'female' ? 'Nữ' : 'Khác'}
      />
      {user.dob && (
        <InfoRow icon={<Calendar size={16} />} label="Ngày sinh" value={formatDob(user.dob)} />
      )}
    </div>

    {/* Bio */}
    {user.bio && (
      <div className="bg-bg-primary rounded-2xl border border-border-light p-5 md:col-span-2">
        <h3 className="font-semibold text-base text-text-primary mb-3">Giới thiệu</h3>
        <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed italic">
          "{user.bio}"
        </p>
      </div>
    )}
  </div>
);
