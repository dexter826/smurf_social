import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Ban,
  Shield,
  Eye,
  ChevronLeft,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUserCache } from '../store/userCacheStore';
import { useLoadingStore } from '../store/loadingStore';
import { User, BlockOptions, BlockedUserEntry } from '../../shared/types';
import { usePostStore } from '../store/postStore';
import { ConfirmDialog } from '../components/ui';
import { CONFIRM_MESSAGES } from '../constants';
import ChangePasswordModal from '../components/settings/ChangePasswordModal';
import { userService } from '../services/userService';

// Modular components
import PrivacySection from '../components/settings/PrivacySection';
import SecuritySection from '../components/settings/SecuritySection';
import BlockedUsersSection from '../components/settings/BlockedUsersSection';
import { BlockOptionsModal } from '../components/ui/BlockOptionsModal';

type SettingSection = 'appearance' | 'privacy' | 'security' | 'blocked';

interface BlockedUserWithOptions {
  user: User;
  options: BlockedUserEntry;
}

const BASE_MENU_ITEMS: { id: SettingSection; label: string; icon: React.ReactNode }[] = [
  { id: 'privacy', label: 'Quyền riêng tư', icon: <Eye size={20} /> },
  { id: 'security', label: 'Bảo mật', icon: <Shield size={20} /> },
  { id: 'blocked', label: 'Người dùng đã chặn', icon: <Ban size={20} /> },
];

/**
 * Settings Page
 */
const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { users: userCache, fetchUsers } = useUserCache();
  
  const [activeSection, setActiveSection] = useState<SettingSection | null>(
    window.innerWidth >= 768 ? 'privacy' : null
  );
  
  const [blockedList, setBlockedList] = useState<BlockedUserWithOptions[]>([]);
  const setLoading = useLoadingStore(state => state.setLoading);
  const isLoading = useLoadingStore(state => state.loadingStates['settings']);
  
  const [unblockUserId, setUnblockUserId] = useState<string | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [manageBlockTarget, setManageBlockTarget] = useState<BlockedUserWithOptions | null>(null);

  // Sync blocked users
  const loadBlockedUsers = useCallback(async () => {
    if (!currentUser) return;
    setLoading('settings', true);
    try {
      const blockedMap = await userService.getBlockedUsers(currentUser.id);
      const ids = Object.keys(blockedMap);
      if (ids.length === 0) {
        setBlockedList([]);
        return;
      }
      await fetchUsers(ids);
      const list: BlockedUserWithOptions[] = ids
        .map(id => {
          const user = userCache[id];
          if (!user) return null;
          return { user, options: blockedMap[id] };
        })
        .filter((item): item is BlockedUserWithOptions => !!item);
      setBlockedList(list);
    } finally {
      setLoading('settings', false);
    }
  }, [currentUser?.id, fetchUsers, userCache]);

  useEffect(() => {
    loadBlockedUsers();
  }, [currentUser?.id]);

  const handleUnblock = async () => {
    if (!unblockUserId || !currentUser) return;
    try {
      await userService.unblockUser(currentUser.id, unblockUserId);
      useAuthStore.getState().updateBlockEntry('remove', unblockUserId);
      setBlockedList(prev => prev.filter(item => item.user.id !== unblockUserId));
      usePostStore.getState().refreshFeed(currentUser.id);
    } finally {
      setUnblockUserId(null);
    }
  };

  const handleUpdateBlockOptions = async (options: BlockOptions) => {
    if (!manageBlockTarget || !currentUser) return;
    const targetId = manageBlockTarget.user.id;
    
    const hasAnyOption = Object.values(options).some(Boolean);
    
    if (!hasAnyOption) {
      setUnblockUserId(targetId);
      setManageBlockTarget(null);
      return;
    }

    await userService.blockUser(currentUser.id, targetId, options);
    useAuthStore.getState().updateBlockEntry('add', targetId, options);
    
    if (options.hideTheirActivity) {
      usePostStore.getState().filterPostsByAuthor(targetId);
    }

    setBlockedList(prev => prev.map(item =>
      item.user.id === targetId ? { ...item, options: { ...item.options, ...options } } : item
    ));
    setManageBlockTarget(null);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'privacy': return <PrivacySection />;
      case 'security': return <SecuritySection onOpenChangePassword={() => setIsChangePasswordOpen(true)} />;
      case 'blocked': return (
        <BlockedUsersSection 
          isLoading={isLoading} 
          blockedList={blockedList} 
          onManageBlock={setManageBlockTarget} 
        />
      );
      default: return null;
    }
  };

  const currentLabel = useMemo(() => 
    BASE_MENU_ITEMS.find(m => m.id === activeSection)?.label || 'Cài đặt'
  , [activeSection]);

  return (
    <div className="flex h-full w-full bg-bg-secondary overflow-hidden">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex flex-col w-[280px] lg:w-[320px] border-r border-border-light bg-bg-primary">
        <div className="p-6">
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Settings className="text-primary" size={24} />
            Cài đặt
          </h1>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {BASE_MENU_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 cursor-pointer rounded-xl transition-all duration-base ${
                activeSection === item.id
                  ? 'bg-primary-light text-primary font-semibold shadow-sm'
                  : 'hover:bg-bg-hover text-text-secondary'
              }`}
            >
              <div className={activeSection === item.id ? 'text-primary' : 'text-text-tertiary'}>
                {item.icon}
              </div>
              <span>{item.label}</span>
              {item.id === 'blocked' && blockedList.length > 0 && (
                <span className="ml-auto text-[10px] bg-bg-secondary px-2 py-0.5 rounded-full border border-border-light font-bold">
                  {blockedList.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full bg-bg-primary md:bg-bg-secondary relative">
        {/* Header - Mobile & Content Header */}
        <div className="h-[60px] md:h-auto p-4 border-b border-border-light bg-bg-primary flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Back button (Mobile only) */}
            <button 
              onClick={() => setActiveSection(null)}
              className={`md:hidden p-2 hover:bg-bg-hover rounded-full transition-colors ${!activeSection ? 'hidden' : ''}`}
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-lg font-bold text-text-primary">
              {currentLabel}
            </h2>
          </div>
        </div>

        {/* Content / Mobile Menu */}
        <div className="flex-1 overflow-y-auto w-full">
          {/* Mobile Menu List */}
          <div className={`md:hidden p-4 space-y-2 ${activeSection ? 'hidden' : 'block animate-fade-in'}`}>
            <p className="px-2 text-xs font-bold text-text-tertiary uppercase tracking-widest mb-4">Danh mục cài đặt</p>
            {BASE_MENU_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className="w-full flex items-center justify-between p-4 bg-bg-primary rounded-2xl border-2 border-border-light active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-primary-light rounded-xl text-primary">
                    {item.icon}
                  </div>
                  <span className="font-bold text-text-primary">{item.label}</span>
                </div>
                <ChevronRight size={20} className="text-text-tertiary" />
              </button>
            ))}
          </div>

          {/* Section Content */}
          <div className={`p-4 md:p-6 lg:p-8 max-w-3xl mx-auto w-full ${!activeSection && 'hidden md:block'}`}>
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Modals & Dialogs */}
      <ConfirmDialog
        isOpen={!!unblockUserId}
        onClose={() => setUnblockUserId(null)}
        onConfirm={handleUnblock}
        title={CONFIRM_MESSAGES.FRIEND.UNBLOCK.TITLE}
        message={CONFIRM_MESSAGES.FRIEND.UNBLOCK.MESSAGE(blockedList.find(item => item.user.id === unblockUserId)?.user.fullName || 'người này')}
        confirmLabel={CONFIRM_MESSAGES.FRIEND.UNBLOCK.CONFIRM}
      />

      {manageBlockTarget && (
        <BlockOptionsModal
          isOpen={!!manageBlockTarget}
          targetName={manageBlockTarget.user.fullName}
          initialOptions={manageBlockTarget.options}
          onApply={handleUpdateBlockOptions}
          onClose={() => setManageBlockTarget(null)}
        />
      )}

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};

export default SettingsPage;
