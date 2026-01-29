import React from 'react';
import { Skeleton } from '../ui';

export const NotificationSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col">
      {[...Array(6)].map((_, i) => (
        <div 
          key={i} 
          className="flex items-start gap-3 p-3 border-b border-border-light last:border-0"
        >
          <Skeleton variant="circle" width={40} height={40} />
          <div className="flex-1 space-y-2 py-1">
            <Skeleton width="80%" height={16} />
            <Skeleton width="40%" height={12} />
          </div>
          <div className="mt-2">
            <Skeleton variant="circle" width={8} height={8} />
          </div>
        </div>
      ))}
    </div>
  );
};
