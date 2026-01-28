import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="h-full w-full overflow-y-auto bg-bg-secondary animate-in fade-in duration-500">
      {/* Profile Header Skeleton */}
      <div className="bg-bg-primary shadow-sm mb-4">
        <div className="relative w-full h-48 md:h-80 bg-bg-secondary overflow-hidden">
           <Skeleton height="100%" width="100%" />
        </div>
        
        <div className="max-w-5xl mx-auto px-4 relative pb-1">
          <div className="flex flex-col md:flex-row items-end md:items-center -mt-12 md:-mt-16 mb-4 gap-4 px-4">
            {/* Avatar Skeleton */}
            <div className="relative">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-bg-primary bg-bg-primary overflow-hidden shadow-lg">
                <Skeleton variant="circle" width="100%" height="100%" />
              </div>
            </div>
            
            {/* Info Skeleton */}
            <div className="flex-1 pb-2 space-y-2">
              <Skeleton width={200} height={28} />
              <Skeleton width={120} height={16} className="opacity-60" />
            </div>
          </div>
          
          {/* Tabs Skeleton */}
          <div className="flex gap-4 border-t border-border-light pt-2 px-4 h-12">
            <Skeleton width={80} height={24} />
            <Skeleton width={80} height={24} />
            <Skeleton width={80} height={24} />
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
            <div className="bg-bg-primary rounded-xl shadow-sm border border-border-light p-4">
               <Skeleton height={40} className="rounded-lg" />
            </div>
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-bg-primary rounded-xl shadow-sm border border-border-light overflow-hidden">
                <div className="p-4 flex gap-3">
                  <Skeleton variant="circle" width={40} height={40} />
                  <div className="space-y-2">
                    <Skeleton width={150} height={16} />
                    <Skeleton width={100} height={12} className="opacity-50" />
                  </div>
                </div>
                <div className="px-4 pb-4 space-y-2">
                  <Skeleton width="90%" height={16} />
                  <Skeleton width="40%" height={16} />
                  <Skeleton variant="rect" width="100%" height={240} className="mt-4 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
