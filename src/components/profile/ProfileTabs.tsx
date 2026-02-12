import React, { useState } from 'react';
import { Button } from '../ui';

type TabType = 'posts' | 'media';

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
            <Button
              key={tab.id}
              variant="ghost"
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-3 text-sm transition-all duration-base relative rounded-none focus:!ring-0 focus:!ring-offset-0 hover:bg-transparent !outline-none border-b-2 ${activeTab === tab.id
                  ? 'text-primary border-primary font-bold'
                  : 'text-text-secondary border-transparent font-medium'
                }`}
              style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
