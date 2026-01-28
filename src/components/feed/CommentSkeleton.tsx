import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

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
        <div key={i} className="flex gap-3 animate-pulse">
          <Skeleton circle width={depth > 0 ? 32 : 40} height={depth > 0 ? 32 : 40} />
          <div className="flex-1">
            <div className="bg-bg-secondary/50 rounded-2xl px-4 py-3 inline-block w-48 max-w-full">
              <Skeleton width="60%" height={12} className="mb-2" />
              <Skeleton count={1} height={10} width="90%" />
            </div>
            <div className="flex gap-3 mt-1 ml-2">
              <Skeleton width={40} height={8} />
              <Skeleton width={40} height={8} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
