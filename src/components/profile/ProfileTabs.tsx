import React, { useState } from 'react';

type TabType = 'media' | 'posts' | 'friends';

interface ProfileTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({
  activeTab,
  onTabChange
}) => {
  const tabs: { id: TabType; label: string }[] = [
    { id: 'posts', label: 'Tất cả' },
    { id: 'media', label: 'Ảnh/Video' }
  ];

  return (
    <div className="transition-theme">
      <div className="max-w-5xl mx-auto px-4 border-b border-divider">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-3 text-sm transition-all relative ${
                activeTab === tab.id
                  ? 'text-primary-600 font-bold'
                  : 'text-text-secondary font-medium hover:bg-bg-hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
