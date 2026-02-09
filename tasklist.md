# 📋 TASKLIST REFACTOR - SMURF SOCIAL

## 🔴 CRITICAL (Bugs / Security)

- [x] **T1: Fix memory leak `compressImage`** — `imageUtils.ts`: thiếu `URL.revokeObjectURL()` sau `createObjectURL`
- [x] **T2: Fix logic bug notification reaction** — `postService.ts L448`: điều kiện `!currentReaction && reactions[userId]` luôn `false` → notification không bao giờ gửi
- [x] **T3: Fix `replyToMessage` format inconsistent** — `messageService.ts`: dùng flat fields (`lastMessageId`, `lastMessageContent`) thay vì nested `lastMessage: {}` như các hàm khác
- [x] **T4: Fix `recallMessage` field format** — `messageService.ts L487`: dùng `lastMessageContent` flat thay vì `lastMessage.content`
- [x] **T5: Fix race condition `subscribeToComments`** — `commentService.ts L341`: `async` trong `forEach` → fire-and-forget
- [x] **T6: Fix unsafe JSON.parse** — `uploadUtils.ts L62`: `JSON.parse(xhr.responseText)` thiếu try-catch
- [x] **T7: Fix stale closure `useAudioRecorder`** — `recordingDuration` trong `onstop` handler luôn = 0

## 🟡 HIGH (Refactoring lớn)

- [x] **T8: Refactor `useChat.ts` → compose từ sub-hooks** — 489 → ~190 dòng
- [x] **T9: Refactor `useProfile.ts` → compose từ sub-hooks** — 412 → ~100 dòng
- [x] **T10: Gom image compression config vào constants** — `IMAGE_COMPRESSION` trong `appConfig.ts`
- [x] **T11: Di chuyển `withRetry` ra `retryUtils.ts`**
- [x] **T12: Fix `fileUtils.ts` labels map thiếu VIDEO**

## 🟢 MEDIUM (Cleanup & Consistency)

- [x] **T13: Dọn dead code & unused imports** — 9 files
- [x] **T14: Fix `REACTION_LABELS` type** — `Record<ReactionType, string>`
- [x] **T15: Fix `validation.ts` chưa barrel export**
- [x] **T16: Fix naming `resetState` → `reset`** — reportStore + authStore caller
- [x] **T17: Fix FriendStatus enum duplicate** — Gom vào `types.ts`
- [x] **T18: Fix typo `"thù thị"` → `"thù địch"`**
- [x] **T19: Xóa 6 thư mục store rỗng**
- [x] **T20: Fix `any` types** — dateUtils (`DateLike` union), useChatBlock (`User | null`), useChatGroups (`Conversation[]`), messageSlice (bỏ `as any`)
- [x] **T21: Xóa re-export dư thừa** — `appConfig.ts`
- [x] **T22: Fix `GROUP_LIMITS.NAME_MAX_LENGTH` → `USER_NAME_MAX_LENGTH`**
