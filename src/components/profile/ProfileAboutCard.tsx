import React from 'react';
import { User as UserIcon, Cake, MapPin, GraduationCap, Heart, CalendarDays, Sparkles } from 'lucide-react';
import { Gender, MaritalStatus, User } from '../../../shared/types';
import { toDate } from '../../utils/dateUtils';

interface ProfileAboutCardProps {
  profile: User;
}

export const ProfileAboutCard: React.FC<ProfileAboutCardProps> = ({ profile }) => {
  const hasDetails = profile.gender || profile.dob || profile.location || profile.school || 
                     profile.maritalStatus || profile.generation || profile.createdAt || 
                     (profile.interests && profile.interests.length > 0);

  return (
    <div className="bg-bg-primary rounded-2xl border border-border-light p-4">
      <h3 className="font-semibold text-base text-text-primary mb-4">Giới thiệu</h3>

      {profile.bio && (
        <p className="text-sm text-text-secondary italic text-center mb-4 leading-relaxed">
          "{profile.bio}"
        </p>
      )}

      {hasDetails ? (
        <div className="space-y-3">
          {profile.gender && (
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <div className="w-8 h-8 flex items-center justify-center bg-bg-secondary rounded-lg flex-shrink-0">
                <UserIcon size={15} />
              </div>
              <span>
                Giới tính{' '}
                <strong className="text-text-primary font-medium">
                  {profile.gender === Gender.MALE ? 'Nam' : 'Nữ'}
                </strong>
              </span>
            </div>
          )}
          {profile.dob && (
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <div className="w-8 h-8 flex items-center justify-center bg-bg-secondary rounded-lg flex-shrink-0">
                <Cake size={15} />
              </div>
              <span>
                Sinh ngày{' '}
                <strong className="text-text-primary font-medium">
                  {toDate(profile.dob)?.toLocaleDateString('vi-VN')}
                </strong>
              </span>
            </div>
          )}
          {profile.location && (
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <div className="w-8 h-8 flex items-center justify-center bg-bg-secondary rounded-lg flex-shrink-0">
                <MapPin size={15} />
              </div>
              <span>
                Đến từ{' '}
                <strong className="text-text-primary font-medium">
                  {profile.location}
                </strong>
              </span>
            </div>
          )}
          {profile.school && (
            <div className="flex flex-col gap-1 items-start text-sm text-text-secondary">
              <div className="flex gap-3">
                <div className="w-8 h-8 flex items-center justify-center bg-bg-secondary rounded-lg flex-shrink-0">
                  <GraduationCap size={15} />
                </div>
                <span className="mt-1">
                  Từng học tại <strong className="text-text-primary font-medium">{profile.school}</strong>
                </span>
              </div>
            </div>
          )}
          {profile.maritalStatus && profile.maritalStatus !== MaritalStatus.NONE && (
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <div className="w-8 h-8 flex items-center justify-center bg-bg-secondary rounded-lg flex-shrink-0">
                <Heart size={15} />
              </div>
              <span>
                Trạng thái:{' '}
                <strong className="text-text-primary font-medium">
                  {profile.maritalStatus === MaritalStatus.SINGLE ? 'Độc thân vui vẻ' :
                   profile.maritalStatus === MaritalStatus.MARRIED ? 'Đã kết hôn' :
                   profile.maritalStatus === MaritalStatus.DIVORCED ? 'Đã ly hôn' :
                   profile.maritalStatus === MaritalStatus.WIDOWED ? 'Chăn đơn gối chiếc' :
                   'Mối quan hệ phức tạp'}
                </strong>
              </span>
            </div>
          )}
          {profile.generation && (
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <div className="w-8 h-8 flex items-center justify-center bg-bg-secondary rounded-lg flex-shrink-0">
                <Sparkles size={15} />
              </div>
              <span>
                Thành viên hệ{' '}
                <strong className="text-text-primary font-medium">
                  {profile.generation}
                </strong>
              </span>
            </div>
          )}
          {profile.createdAt && (
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <div className="w-8 h-8 flex items-center justify-center bg-bg-secondary rounded-lg flex-shrink-0">
                <CalendarDays size={15} />
              </div>
              <span>
                Tham gia từ{' '}
                <strong className="text-text-primary font-medium">
                  Tháng {toDate(profile.createdAt)?.toLocaleDateString('vi-VN', { month: 'numeric', year: 'numeric' })}
                </strong>
              </span>
            </div>
          )}
          {profile.interests && profile.interests.length > 0 && (
            <div className="pt-3 mt-3 border-t border-border-light/60">
              <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2.5 ml-1">Sở thích</h4>
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.map(tag => (
                  <span key={tag} className="px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-text-tertiary text-center py-2">
          Chưa có thông tin giới thiệu
        </p>
      )}
    </div>
  );
};
