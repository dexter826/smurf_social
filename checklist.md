# Lộ trình Refactor UI - Smurf Social

## Phase 0: Cấu hình Tokens & System
- [x] index.css (src/styles)
- [x] tailwind.config.js (Gốc)

---

## Phase 1: Thư viện Component (src/components/ui)

### 1.1. Buttons & Actions
- [x] Button.tsx
- [x] IconButton.tsx
- [x] Dropdown.tsx

### 1.2. Form Inputs
- [x] Input.tsx
- [x] TextArea.tsx
- [x] Select.tsx
- [x] Checkbox.tsx
- [x] DatePicker.tsx

### 1.3. Avatar & Media
- [x] Avatar.tsx
- [x] UserAvatar.tsx
- [x] LazyMedia.tsx
- [x] MediaViewer.tsx
- [x] ImageCropper.tsx

### 1.4. Feedback & Status
- [x] CircularProgress.tsx
- [x] Loading.tsx
- [x] ScreenLoader.tsx
- [x] Skeleton.tsx
- [x] Toast.tsx
- [x] UploadProgress.tsx
- [x] ConnectionStatus.tsx
- [x] UserStatusText.tsx
- [x] BannedBadge.tsx

### 1.5. Overlay & Modals
- [x] Modal.tsx
- [x] ReportModal.tsx
- [x] ReactionDetailsModal.tsx
- [x] BlockOptionsModal.tsx

### 1.6. Reactions
- [x] EmojiPicker.tsx
- [x] ReactionDisplay.tsx
- [x] ReactionSelector.tsx

---

## Phase 2: Hệ thống Layout & Navigation

### 2.1. Core Layouts (src/components/layout)
- [x] AppLayout.tsx
- [x] AdminLayout.tsx

### 2.2. Navigation Components
- [x] MobileMenuPage.tsx (src/pages)

---

## Phase 3: Auth & Core Pages

### 3.1. Auth Pages (src/pages)
- [x] LoginPage.tsx
- [x] EmailVerificationPage.tsx
- [x] BannedPage.tsx

---

## Phase 4: Social Feature (Feed & Profile)

### 4.1. Core Feed (src/components/feed)
- [x] FeedPage.tsx (src/pages)
- [x] CreatePost.tsx
- [x] PostItem.tsx
- [x] FeedSkeleton.tsx

### 4.2. Comment System (src/components/feed/comment)
- [x] CommentInput.tsx
- [x] CommentItem.tsx
- [x] CommentSection.tsx
- [x] CommentSkeleton.tsx

### 4.3. Social Shared (src/components/feed/modals | shared)
- [x] PostModal.tsx
- [x] PostViewModal.tsx
- [x] PostMediaGrid.tsx
- [x] ReactionActions.tsx
- [x] SystemPostMedia.tsx
- [x] TruncatedText.tsx
- [x] VisibilityBadge.tsx

### 4.4. Profile (src/components/profile)
- [x] ProfilePage.tsx (src/pages)
- [x] ProfileHeader.tsx
- [x] ProfileTabs.tsx
- [x] ProfileSkeleton.tsx
- [x] AboutTab.tsx
- [x] PhotosTab.tsx
- [x] PostsTab.tsx
- [x] EditProfileModal.tsx

---

## Phase 5: Messaging & Real-time (Chat)

### 5.1. Main Chat (src/components/chat)
- [x] ChatPage.tsx (src/pages)
- [x] ChatBox.tsx
- [x] ChatBoxHeader.tsx
- [x] ChatBoxSkeleton.tsx
- [x] MessageList.tsx
- [x] MessengerSkeleton.tsx
- [x] TypingIndicator.tsx

### 5.2. Conversation & Message
- [x] ConversationList.tsx
- [x] ConversationHeader.tsx
- [x] ConversationItem.tsx
- [x] ConversationFilters.tsx
- [x] SearchResults.tsx
- [x] MessageBubble.tsx
- [x] MessageContent.tsx
- [x] MessageActions.tsx
- [x] MessageStatus.tsx
- [x] MessageRequestBanner.tsx

### 5.3. Chat Inputs & Features
- [x] ChatInput.tsx
- [x] ActionsMenu.tsx
- [x] FilePreview.tsx
- [x] MentionList.tsx
- [x] RecordingUI.tsx
- [x] ReactionIcons.tsx

### 5.4. Chat Details & Actions
- [x] ChatDetailsPanel.tsx
- [x] ChatDetailsHeader.tsx
- [x] ChatDetailsMedia.tsx
- [x] ChatDetailsMemberList.tsx
- [x] ChatDetailsActions.tsx
- [x] ChatDetailsSearch.tsx

### 5.5. Chat Calls & Modals
- [x] CallWindow.tsx
- [x] IncomingCallDialog.tsx
- [x] OutgoingCallDialog.tsx
- [x] AddMemberModal.tsx
- [x] CreateGroupModal.tsx
- [x] EditGroupModal.tsx
- [x] ForwardModal.tsx
- [x] TransferAdminModal.tsx

---

## Phase 6: Connections & Notifications

### 6.1. Contacts (src/components/contacts)
- [x] ContactsPage.tsx (src/pages)
- [x] AddFriendModal.tsx
- [x] FriendItem.tsx
- [x] FriendRequestItem.tsx

### 6.2. Notifications (src/components/notifications)
- [x] NotificationsPage.tsx (src/pages)
- [x] NotificationDropdown.tsx
- [x] NotificationItem.tsx
- [x] NotificationList.tsx
- [x] NotificationSkeleton.tsx

---

## Phase 7: Settings & Administration

### 7.1. Settings (src/components/settings)
- [x] SettingsPage.tsx (src/pages)
- [x] SettingItem.tsx
- [x] Toggle.tsx
- [x] PrivacySection.tsx
- [x] SecuritySection.tsx
- [x] BlockedUsersSection.tsx
- [x] ChangePasswordModal.tsx

### 7.2. Admin (src/components/admin)
- [x] AdminReportsPage.tsx (src/pages)
- [x] AdminUsersPage.tsx (src/pages)
- [x] ReportsView.tsx
- [x] UsersView.tsx
- [x] ReportDetailModal.tsx
