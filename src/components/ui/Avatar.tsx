import React from 'react';
import { getInitials, getAvatarGradient } from '../../utils/avatarUtils';
import { User } from '../../types';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  status?: 'online' | 'offline' | 'busy';
  className?: string;
  isGroup?: boolean;
  members?: User[];
}

export const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  name, 
  size = 'md', 
  status, 
  className = '', 
  isGroup,
  members = []
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-24 h-24 text-xl',
    '2xl': 'w-32 h-32 text-2xl'
  };

  const statusColor = {
    online: 'bg-status-online border-bg-primary',
    offline: 'bg-status-offline border-bg-primary',
    busy: 'bg-status-away border-bg-primary'
  };

  const renderContent = () => {
    // Ưu tiên hiển thị ảnh nếu có
    if (src && src !== '/blank-avatar.png') {
      return (
        <img
          className="w-full h-full object-cover"
          src={src}
          alt={name}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }

    // Hiển thị Avatar nhóm kiểu Zalo (vòng tròn lồng nhau)
    if (isGroup && members.length > 0) {
      const displayMembers = members.slice(0, 4);
      const count = displayMembers.length;

      // Cấu hình vị trí và kích thước cho từng số lượng thành viên
      const getPositionClasses = (index: number, total: number) => {
        if (total === 1) return 'w-full h-full';
        
        if (total === 2) {
          return index === 0 
            ? 'w-[65%] h-[65%] top-0 left-0 z-10' 
            : 'w-[65%] h-[65%] bottom-0 right-0';
        }

        if (total === 3) {
          if (index === 0) return 'w-[58%] h-[58%] top-0 left-1/2 -translate-x-1/2 z-10';
          if (index === 1) return 'w-[58%] h-[58%] bottom-0 left-0';
          return 'w-[58%] h-[58%] bottom-0 right-0 z-20';
        }

        // total === 4
        if (index === 0) return 'w-[58%] h-[58%] top-0 left-0 z-10';
        if (index === 1) return 'w-[58%] h-[58%] top-0 right-0';
        if (index === 2) return 'w-[58%] h-[58%] bottom-0 left-0 z-20';
        return 'w-[58%] h-[58%] bottom-0 right-0 z-30';
      };

      return (
        <div className="relative w-full h-full bg-transparent">
          {displayMembers.map((member, idx) => {
            const isLastOfMany = idx === 3 && members.length > 4;
            
            return (
              <div 
                key={member.id || idx} 
                className={`absolute rounded-full overflow-hidden border-2 border-bg-primary bg-secondary flex items-center justify-center ${getPositionClasses(idx, count)}`}
              >
                {isLastOfMany ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-600 text-[8px] font-bold text-white">
                    99+
                  </div>
                ) : member.avatar ? (
                  <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white uppercase"
                    style={{ background: getAvatarGradient(member.name || member.id) }}
                  >
                    {getInitials(member.name).substring(0, 1)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div 
        className="w-full h-full flex items-center justify-center font-bold text-white uppercase"
        style={{ background: getAvatarGradient(name || '?') }}
      >
        {getInitials(name || '?')}
      </div>
    );
  };

  return (
    <div className={`relative inline-block ${!isGroup ? 'rounded-full' : ''} ${className}`}>
      <div className={`${sizeClasses[size]} relative ${!isGroup ? 'rounded-full overflow-hidden border border-border-light bg-secondary' : ''} flex items-center justify-center`}>
        {renderContent()}
      </div>
      {status && (
        <span className={`absolute bottom-0.5 right-0.5 block h-3 w-3 rounded-full border-2 ${statusColor[status]}`} />
      )}
    </div>
  );
};


