import React from 'react';
import { MapPin, Briefcase, GraduationCap, Mail, Phone, Calendar, User as UserIcon } from 'lucide-react';
import { User } from '../../types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface AboutTabProps {
  user: User;
}

export const AboutTab: React.FC<AboutTabProps> = ({ user }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Thông tin liên hệ */}
        <div className="bg-bg-main rounded-lg shadow-card p-6">
          <h3 className="font-bold text-lg mb-4 text-text-main">Thông tin liên hệ</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail size={20} className="text-text-secondary mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-text-secondary">Email</p>
                <p className="text-text-main">{user.email}</p>
              </div>
            </div>

            {user.phone && (
              <div className="flex items-start gap-3">
                <Phone size={20} className="text-text-secondary mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-text-secondary">Số điện thoại</p>
                  <p className="text-text-main">{user.phone}</p>
                </div>
              </div>
            )}

            {user.location && (
              <div className="flex items-start gap-3">
                <MapPin size={20} className="text-text-secondary mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-text-secondary">Địa chỉ</p>
                  <p className="text-text-main">{user.location}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Thông tin cơ bản */}
        <div className="bg-bg-main rounded-lg shadow-card p-6">
          <h3 className="font-bold text-lg mb-4 text-text-main">Thông tin cơ bản</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <UserIcon size={20} className="text-text-secondary mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-text-secondary">Giới tính</p>
                <p className="text-text-main">
                  {user.gender === 'male' ? 'Nam' : user.gender === 'female' ? 'Nữ' : 'Khác'}
                </p>
              </div>
            </div>

            {user.birthDate && (
              <div className="flex items-start gap-3">
                <Calendar size={20} className="text-text-secondary mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-text-secondary">Ngày sinh</p>
                  <p className="text-text-main">
                    {format(user.birthDate, 'dd MMMM yyyy', { locale: vi })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Công việc & Học vấn */}
        <div className="bg-bg-main rounded-lg shadow-card p-6 md:col-span-2">
          <h3 className="font-bold text-lg mb-4 text-text-main">Công việc & Học vấn</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {user.workplace && (
              <div className="flex items-start gap-3">
                <Briefcase size={20} className="text-text-secondary mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-text-secondary">Nơi làm việc</p>
                  <p className="text-text-main">{user.workplace}</p>
                </div>
              </div>
            )}

            {user.education && (
              <div className="flex items-start gap-3">
                <GraduationCap size={20} className="text-text-secondary mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-text-secondary">Học vấn</p>
                  <p className="text-text-main">{user.education}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Giới thiệu */}
        {user.bio && (
          <div className="bg-bg-main rounded-lg shadow-card p-6 md:col-span-2">
            <h3 className="font-bold text-lg mb-4 text-text-main">Giới thiệu</h3>
            <p className="text-text-main whitespace-pre-wrap">{user.bio}</p>
          </div>
        )}

      </div>
    </div>
  );
};
