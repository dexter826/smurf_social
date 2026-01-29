import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const ChatBoxSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 p-4 bg-bg-secondary h-full overflow-hidden">
      <div className="flex flex-col items-start gap-2 max-w-[70%]">
        <Skeleton height={40} width="60%" className="rounded-2xl rounded-tl-none" />
        <Skeleton variant="circle" width={32} height={32} />
      </div>
      <div className="flex flex-col items-end gap-2 max-w-[70%] ml-auto">
        <Skeleton height={60} width="80%" className="rounded-2xl rounded-tr-none bg-primary/20" />
      </div>
      <div className="flex flex-col items-start gap-2 max-w-[70%]">
        <Skeleton height={40} width="40%" className="rounded-2xl rounded-tl-none" />
      </div>
      <div className="flex flex-col items-end gap-2 max-w-[70%] ml-auto">
        <Skeleton height={120} width="100%" className="rounded-2xl rounded-tr-none bg-primary/20" />
      </div>
      <div className="flex flex-col items-start gap-2 max-w-[70%]">
        <Skeleton height={40} width="50%" className="rounded-2xl rounded-tl-none" />
      </div>
    </div>
  );
};
