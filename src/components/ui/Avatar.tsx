import React from 'react';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  status?: 'online' | 'offline' | 'busy';
  className?: string;
  isGroup?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', status, className = '', isGroup }) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-24 h-24 text-xl',
    '2xl': 'w-32 h-32 text-2xl'
  };

  const statusColor = {
    online: 'bg-green-500 border-white',
    offline: 'bg-gray-400 border-white',
    busy: 'bg-red-500 border-white'
  };

  return (
    <div className={`relative inline-block rounded-full ${className}`}>
      <div className={`${sizeClasses[size]} relative rounded-full overflow-hidden border border-gray-100 bg-gray-200 flex items-center justify-center`}>
        {src ? (
          <img
            className="w-full h-full object-cover"
            src={src}
            alt={name}
            onError={(e) => {
                (e.target as HTMLImageElement).src = '/blank-avatar.png';
            }}
          />
        ) : (
          <img
            className="w-full h-full object-cover"
            src="/blank-avatar.png"
            alt={name || 'User'}
          />
        )}
      </div>
      {status && (
        <span className={`absolute bottom-0.5 right-0.5 block h-3 w-3 rounded-full border-2 ${statusColor[status]}`} />
      )}
    </div>
  );
};
