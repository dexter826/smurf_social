import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  /** Kiểu hiển thị của loading */
  variant?: 'spinner' | 'page' | 'overlay' | 'inline';
  /** Kích thước của spinner */
  size?: 'sm' | 'md' | 'lg' | number;
  /** Văn bản hiển thị đi kèm */
  text?: string;
  /** Class CSS bổ sung */
  className?: string;
  /** Màu sắc của spinner */
  color?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  variant = 'spinner',
  size = 'md',
  text,
  className = '',
  color = 'text-primary'
}) => {
  // Xác định kích thước cụ thể
  const getIconSize = () => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'sm': return 16;
      case 'lg': return 48;
      case 'md':
      default: return 32;
    }
  };

  const iconSize = getIconSize();
  const spinner = (
    <Loader2 
      className={`animate-spin ${color} shrink-0`} 
      size={iconSize} 
    />
  );

  // Loading đơn thuần (chỉ icon)
  if (variant === 'spinner') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        {spinner}
        {text && <span className="ml-2 text-text-secondary text-sm font-medium">{text}</span>}
      </div>
    );
  }

  // Loading toàn trang
  if (variant === 'page') {
    return (
      <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-bg-primary transition-theme ${className}`}>
        {spinner}
        {text && <p className="mt-4 text-text-secondary font-medium">{text}</p>}
      </div>
    );
  }

  // Loading lớp phủ (cho các container có position relative)
  if (variant === 'overlay') {
    return (
      <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-bg-primary/60 backdrop-blur-[2px] rounded-inherit transition-theme ${className}`}>
        {spinner}
        {text && <p className="mt-2 text-text-secondary text-sm font-medium">{text}</p>}
      </div>
    );
  }

  // Loading có padding (mặc định dùng cho nội dung danh sách)
  return (
    <div className={`flex flex-col items-center justify-center p-8 w-full ${className}`}>
      {spinner}
      {text && <p className="mt-2 text-text-secondary text-sm font-medium">{text}</p>}
    </div>
  );
};
