import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'line' | 'circle' | 'rect';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  variant = 'rect'
}) => {
  const baseClasses = 'animate-pulse bg-secondary';
  
  const variantClasses = {
    line: 'rounded',
    circle: 'rounded-full',
    rect: 'rounded-lg'
  };

  const style: React.CSSProperties = {
    width: width,
    height: height
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};
