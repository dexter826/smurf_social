import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="h-full w-full overflow-y-auto bg-bg-secondary animate-in fade-in duration-500">
      {/* Profile Header Skeleton */}
      <div className="bg-bg-primary shadow-sm mb-4">
        <div className="relative w-full h-[200px] md:h-[320px] bg-bg-secondary overflow-hidden">
           <Skeleton height="100%" width="100%" />
        </div>
        
        <div className="max-w-5xl mx-auto px-4 relative pb-1">
          <div className="flex flex-col md:flex-row items-center md:items-end text-center md:text-left -mt-16 md:-mt-20 mb-6 gap-6">
            {/* Avatar Skeleton */}
            <div className="relative z-20 mx-auto md:mx-0">
              <div className="p-1 bg-bg-primary rounded-full">
                <div className="w-32 h-32 rounded-full border-4 border-bg-primary bg-bg-primary overflow-hidden shadow-lg">
                  <Skeleton variant="circle" width="100%" height="100%" />
                </div>
              </div>
            </div>
            
            {/* Info Skeleton */}
            <div className="flex-1 pb-1 space-y-3 w-full flex flex-col items-center md:items-start">
              <Skeleton width={200} height={36} className="mb-2" />
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                 <Skeleton width={100} height={24} className="rounded-lg" />
                 <Skeleton width={100} height={24} className="rounded-lg" />
              </div>
            </div>

            {/* Actions Skeleton */}
            <div className="flex justify-center md:justify-end gap-2 w-full md:w-auto mb-2">
              <Skeleton width={120} height={40} className="rounded-xl" />
              <Skeleton width={40} height={40} className="rounded-xl block md:hidden" />
            </div>
          </div>
          
          {/* Tabs Skeleton */}
          <div className="flex gap-1 md:gap-4 border-t border-border-light pt-0 h-14 overflow-x-auto no-scrollbar">
            <div className="flex items-center px-4 min-w-max gap-6">
              <Skeleton width={100} height={24} />
              <Skeleton width={100} height={24} />
              <Skeleton width={80} height={24} />
              <Skeleton width={80} height={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content Skeleton */}
      <div className="max-w-5xl mx-auto px-4 pt-2 pb-12">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Column (Info) */}
          <div className="w-full md:w-[360px] flex-shrink-0 space-y-4">
            <div className="bg-bg-primary rounded-xl shadow-sm border border-border-light p-4 space-y-4">
              <Skeleton width={100} height={24} />
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Skeleton variant="rect" width={32} height={32} className="rounded-lg" />
                  <Skeleton width="70%" height={16} className="mt-2" />
                </div>
                <div className="flex gap-3">
                  <Skeleton variant="rect" width={32} height={32} className="rounded-lg" />
                  <Skeleton width="60%" height={16} className="mt-2" />
                </div>
                <div className="flex gap-3">
                  <Skeleton variant="rect" width={32} height={32} className="rounded-lg" />
                  <Skeleton width="50%" height={16} className="mt-2" />
                </div>
              </div>
            </div>

            <div className="bg-bg-primary rounded-xl shadow-sm border border-border-light p-4 space-y-4">
              <div className="flex justify-between">
                <Skeleton width={120} height={24} />
                <Skeleton width={60} height={16} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Skeleton variant="rect" className="aspect-square rounded-lg" />
                <Skeleton variant="rect" className="aspect-square rounded-lg" />
                <Skeleton variant="rect" className="aspect-square rounded-lg" />
                <Skeleton variant="rect" className="aspect-square rounded-lg" />
                <Skeleton variant="rect" className="aspect-square rounded-lg" />
                <Skeleton variant="rect" className="aspect-square rounded-lg" />
              </div>
            </div>
          </div>

          {/* Right Column (Posts) */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="bg-bg-primary rounded-xl shadow-sm border border-border-light p-3 sm:p-4">
               <Skeleton height={40} className="w-full rounded-full" />
            </div>
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-bg-primary rounded-xl shadow-sm border border-border-light mb-4 text-left">
                <div className="p-3 sm:p-4 flex items-start justify-between">
                  <div className="flex gap-3">
                    <Skeleton variant="circle" width={40} height={40} />
                    <div className="space-y-2">
                       <Skeleton variant="line" width={128} height={16} />
                       <Skeleton variant="line" width={80} height={12} className="opacity-50" />
                    </div>
                  </div>
                </div>
                <div className="px-3 sm:px-4 pb-3 space-y-2">
                  <Skeleton variant="line" width="90%" height={16} className="opacity-70" />
                  <Skeleton variant="line" width="60%" height={16} className="opacity-70" />
                </div>
                <div className="w-full h-64 bg-bg-secondary flex items-center justify-center">
                   <Skeleton variant="rect" width={48} height={48} className="opacity-20" />
                </div>
                <div className="flex px-2 py-1 border-t border-border-light">
                   <div className="flex-1 flex justify-center py-2">
                      <Skeleton variant="line" width={64} height={20} className="opacity-50" />
                   </div>
                   <div className="flex-1 flex justify-center py-2">
                       <Skeleton variant="line" width={64} height={20} className="opacity-50" />
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
