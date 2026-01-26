import React from 'react';
import SkeletonLib, { SkeletonProps as SkeletonLibProps, SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface SkeletonProps extends SkeletonLibProps {
  className?: string;
  variant?: 'line' | 'circle' | 'rect';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rect',
  ...props
}) => {
  const isCircle = variant === 'circle';

  return (
    <SkeletonTheme 
      baseColor="var(--bg-hover)" 
      highlightColor="var(--bg-primary)"
    >
      <SkeletonLib
        circle={isCircle}
        className={className}
        {...props}
      />
    </SkeletonTheme>
  );
};
