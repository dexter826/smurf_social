import React from 'react';
import { Skeleton } from '../ui/Skeleton';

interface CommentSkeletonProps {
  count?: number;
  depth?: number;
}

export const CommentSkeleton: React.FC<CommentSkeletonProps> = ({ 
  count = 3, 
  depth = 0 
}) => {
  return (
    <div className={`space-y-4 ${depth > 0 ? 'ml-10 mt-2' : ''}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-2">
          <Skeleton variant="circle" width={depth > 0 ? 24 : 32} height={depth > 0 ? 24 : 32} />
          <div className="flex-1 max-w-[85%]">
            <div className="bg-bg-secondary rounded-2xl px-3 py-2 space-y-2">
              <Skeleton width={80} height={12} className="opacity-70" />
              <Skeleton width="90%" height={14} />
            </div>
            <div className="flex gap-3 mt-1 ml-2">
              <Skeleton width={40} height={10} className="opacity-50" />
              <Skeleton width={40} height={10} className="opacity-50" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
