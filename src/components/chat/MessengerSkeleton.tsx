import React from 'react';
import { Skeleton } from '../ui/Skeleton';
import { ConversationItem } from './conversation/ConversationItem';

export const MessengerSkeleton: React.FC = () => {
  return (
    <div className="flex h-full w-full bg-bg-primary overflow-hidden">
      {/* Sidebar Skeleton */}
      <div className="flex flex-col w-full md:w-[320px] border-r border-border-light flex-shrink-0">
        <div className="p-4 border-b border-border-light space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton width={120} height={24} />
            <Skeleton variant="circle" width={32} height={32} />
          </div>
          <Skeleton height={40} className="rounded-xl" />
          <div className="flex gap-2">
            <Skeleton width={60} height={24} className="rounded-full" />
            <Skeleton width={60} height={24} className="rounded-full" />
          </div>
        </div>
        <div className="flex-1 p-2">
          {[...Array(8)].map((_, i) => (
            <ConversationItem.Skeleton key={i} />
          ))}
        </div>
      </div>

      {/* Main Chat Skeleton */}
      <div className="hidden md:flex flex-1 flex-col bg-bg-secondary">
        <div className="h-16 px-4 border-b border-border-light bg-bg-primary flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton variant="circle" width={40} height={40} />
            <div className="space-y-1">
              <Skeleton width={120} height={16} />
              <Skeleton width={60} height={12} />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton variant="circle" width={36} height={36} />
            <Skeleton variant="circle" width={36} height={36} />
            <Skeleton variant="circle" width={36} height={36} />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-6">
          <div className="flex flex-col items-start gap-2 max-w-[70%]">
            <Skeleton height={40} width="80%" className="rounded-2xl rounded-tl-none" />
            <Skeleton height={60} width="100%" className="rounded-2xl rounded-tl-none" />
          </div>
          <div className="flex flex-col items-end gap-2 max-w-[70%] ml-auto">
            <Skeleton height={40} width="60%" className="rounded-2xl rounded-tr-none bg-primary/20" />
            <Skeleton height={120} width="100%" className="rounded-2xl rounded-tr-none bg-primary/20" />
          </div>
          <div className="flex flex-col items-start gap-2 max-w-[70%]">
            <Skeleton height={40} width="40%" className="rounded-2xl rounded-tl-none" />
          </div>
        </div>
        <div className="p-4 bg-bg-primary border-t border-border-light">
          <Skeleton height={44} className="rounded-xl" />
        </div>
      </div>
    </div>
  );
};
