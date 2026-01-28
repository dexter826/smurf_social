import React from 'react';
import { PostItem } from './PostItem';
import { CreatePost } from './CreatePost';

export const FeedSkeleton: React.FC = () => {
  return (
    <div className="flex justify-center h-full w-full bg-bg-secondary">
      <div className="w-full max-w-[720px] py-6 space-y-4 px-2 md:px-0 animate-in fade-in duration-500">
        <CreatePost.Skeleton />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <PostItem.Skeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
};
