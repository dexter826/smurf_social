import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  variant?: 'spinner' | 'page' | 'overlay' | 'inline' | 'cube';
  size?: 'sm' | 'md' | 'lg' | number;
  text?: string;
  className?: string;
  color?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  variant = 'spinner',
  size = 'md',
  text,
  className = '',
  color = 'text-primary',
}) => {
  const iconSize = typeof size === 'number' ? size : ({ sm: 16, md: 32, lg: 48 })[size];
  const spinner = <Loader2 className={`animate-spin ${color} shrink-0`} size={iconSize} />;

  if (variant === 'cube' || variant === 'page') {
    return (
      <div
        className={`fixed inset-0 flex flex-col justify-center items-center bg-bg-primary gap-8 transition-theme ${className}`}
        style={{ zIndex: 'var(--z-toast)' }}
      >
        <div className="grid grid-cols-2 gap-3 w-16 h-16 animate-rotate-loader">
          <div className="w-full h-full rounded-lg screen-loader-cube" />
          <div className="w-full h-full rounded-lg screen-loader-cube" />
          <div className="w-full h-full rounded-lg screen-loader-cube" />
          <div className="w-full h-full rounded-lg screen-loader-cube" />
        </div>
        {text && (
          <p className="text-text-secondary font-semibold tracking-wider text-xs uppercase animate-pulse">
            {text}
          </p>
        )}
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-bg-overlay backdrop-blur-[2px] rounded-[inherit] transition-theme ${className}`}>
        {spinner}
        {text && <p className="mt-2 text-text-secondary text-sm font-medium">{text}</p>}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex flex-col items-center justify-center p-8 w-full ${className}`}>
        {spinner}
        {text && <p className="mt-2 text-text-secondary text-sm font-medium">{text}</p>}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {spinner}
      {text && <span className="ml-2 text-text-secondary text-sm font-medium">{text}</span>}
    </div>
  );
};
