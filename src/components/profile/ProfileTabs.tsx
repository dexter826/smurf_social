import React, { useState } from 'react';

type TabType = 'about' | 'posts' | 'friends' | 'photos';

interface ProfileTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({
  activeTab,
  onTabChange
}) => {
  const tabs: { id: TabType; label: string }[] = [
    { id: 'about', label: 'Giới thiệu' },
    { id: 'posts', label: 'Bài viết' },
    { id: 'friends', label: 'Bạn bè' },
    { id: 'photos', label: 'Ảnh' }
  ];

  return (
    <div className="border-b border-divider bg-bg-primary transition-theme">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-3 font-medium text-sm transition-colors relative ${
                activeTab === tab.id
                  ? 'text-primary-500'
                  : 'text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
