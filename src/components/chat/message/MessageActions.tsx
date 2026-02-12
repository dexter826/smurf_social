import React from 'react';
import { MoreVertical, Reply, Forward, RotateCcw, Edit2, Trash2 } from 'lucide-react';

import { Message } from '../../../types';
import { IconButton } from '../../ui';

interface MessageActionsProps {
  message: Message;
  isMe: boolean;
  canEdit: boolean;
  showMenu: boolean;
  setShowMenu: (show: boolean) => void;
  menuPlacement: 'top' | 'bottom';
  menuButtonRef: React.RefObject<HTMLButtonElement>;
  toggleMenu: () => void;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  setShowRecallConfirm: (show: boolean) => void;
  onDeleteForMe?: (messageId: string) => void;
  isBlocked: boolean;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  message,
  isMe,
  canEdit,
  showMenu,
  setShowMenu,
  menuPlacement,
  menuButtonRef,
  toggleMenu,
  onReply,
  onForward,
  onEdit,
  setShowRecallConfirm,
  onDeleteForMe,
  isBlocked,
}) => {
  return (
    <div className={`absolute top-0 opacity-0 group-hover/message:opacity-100 transition-opacity flex items-center gap-1 ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}>
      <IconButton
        ref={menuButtonRef}
        onClick={toggleMenu}
        icon={<MoreVertical size={14} />}
        size="sm"
      />

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className={`absolute z-20 bg-bg-primary border border-border-light rounded-lg shadow-dropdown py-1 w-40 ${isMe ? 'right-0' : 'left-0'} ${
            menuPlacement === 'top' ? 'bottom-full mb-1' : 'top-8'
          }`}>
            <button
              onClick={() => {
                if (!isBlocked) {
                  onReply?.(message);
                  setShowMenu(false);
                }
              }}
              disabled={isBlocked}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                isBlocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-bg-hover'
              }`}
              title={isBlocked ? 'Không thể trả lời khi bị chặn' : ''}
            >
              <Reply size={14} /> Trả lời
            </button>
            <button
              onClick={() => {
                if (!isBlocked) {
                  onForward?.(message);
                  setShowMenu(false);
                }
              }}
              disabled={isBlocked}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                isBlocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-bg-hover'
              }`}
              title={isBlocked ? 'Không thể chuyển tiếp khi bị chặn' : ''}
            >
              <Forward size={14} /> Chuyển tiếp
            </button>
            {canEdit && (
              <button
                onClick={() => {
                  onEdit?.(message);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-bg-hover active:bg-bg-active flex items-center gap-2 transition-colors"
              >
                <Edit2 size={14} /> Chỉnh sửa
              </button>
            )}
            {isMe && (
              <button
                onClick={() => {
                  setShowRecallConfirm(true);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-bg-hover active:bg-bg-active flex items-center gap-2 transition-colors text-warning"
              >
                <RotateCcw size={14} /> Thu hồi
              </button>
            )}
            <button
              onClick={() => {
                onDeleteForMe?.(message.id);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-bg-hover active:bg-bg-active flex items-center gap-2 transition-colors text-error"
            >
              <Trash2 size={14} /> Xóa phía tôi
            </button>
          </div>
        </>
      )}
    </div>
  );
};
