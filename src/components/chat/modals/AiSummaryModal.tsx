import React, { useState, useEffect } from 'react';
import { Send, History, Sparkles, Loader2, Trash2, Clock } from 'lucide-react';
import { Modal, Button, IconButton, TextArea } from '../../ui';
import { aiSummaryService } from '../../../services/ai/aiSummaryService';
import { localSummaryDb, ChatSummary } from '../../../services/ai/localSummaryDb';
import { RtdbMessage, User } from '../../../../shared/types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from '../../../store/toastStore';

interface AiSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Array<{ id: string; data: RtdbMessage }>;
  usersMap: Record<string, User>;
  currentUserId: string;
  conversationId: string;
  conversationName: string;
  memberCount: number;
}

/** Giao diện trợ lý AI hỗ trợ phân tích hội thoại */
export const AiSummaryModal: React.FC<AiSummaryModalProps> = ({
  isOpen, onClose, messages, usersMap, currentUserId, conversationId,
  conversationName, memberCount
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<ChatSummary[]>([]);

  /** Khởi tạo dữ liệu và dọn dẹp khi mở Modal */
  useEffect(() => {
    if (isOpen) {
      const init = async () => {
        await localSummaryDb.cleanupHistory(conversationId);
        await loadHistory();
      };
      init();
      setPrompt('');
    }
  }, [isOpen, conversationId]);

  /** Cập nhật danh sách lịch sử từ bộ nhớ cục bộ */
  const loadHistory = async () => {
    const data = await localSummaryDb.getHistoryByConversationId(conversationId);
    setHistory(data);
  };

  /** Xử lý yêu cầu gửi tới AI và lưu trữ kết quả */
  const handleGenerate = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const currentUser = usersMap[currentUserId];
      const summary = await aiSummaryService.generateSummary(
        messages,
        usersMap,
        currentUserId,
        {
          conversationName,
          memberCount,
          userName: currentUser?.fullName || 'Người dùng'
        },
        prompt.trim() || undefined
      );

      await localSummaryDb.saveSummary({
        conversationId,
        summary,
        userPrompt: prompt.trim() || 'Tóm tắt toàn bộ'
      });

      setPrompt('');
      await loadHistory();
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi tạo tóm tắt');
    } finally {
      setIsLoading(false);
    }
  };

  /** Loại bỏ một bản ghi khỏi lịch sử lưu trữ */
  const handleDelete = async (id: number) => {
    await localSummaryDb.deleteSummary(id);
    await loadHistory();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Assistant"
      maxWidth="md"
      fullScreen="mobile"
      bodyClassName="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <div className="relative group">
          <TextArea
            placeholder="Nhập yêu cầu cụ thể (VD: Tóm tắt các đầu việc...)"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            autoResize
            rows={1}
            maxHeight={100}
            className="bg-bg-secondary !pr-12 transition-all duration-200"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          />
          <div className="absolute bottom-1 right-1 z-20">
            <IconButton
              icon={isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              onClick={handleGenerate}
              disabled={isLoading || (messages.length === 0)}
              variant="primary"
              size="sm"
              className="shadow-lg hover:scale-105 active:scale-95 transition-transform"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-2">
        <div className="flex items-center gap-2 px-1 text-text-secondary">
          <History size={16} />
          <span className="text-sm font-semibold">Lịch sử tóm tắt</span>
        </div>

        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary text-sm italic">
              Chưa có bản tóm tắt nào cho cuộc trò chuyện này.
            </div>
          ) : (
            history.map((item, index) => (
              <div 
                key={item.id} 
                className={`group relative border rounded-xl p-3 transition-all duration-300 ${
                  index === 0 && !isLoading 
                    ? 'bg-primary/5 border-primary/20 shadow-sm' 
                    : 'bg-bg-secondary/50 hover:bg-bg-secondary border-border-light'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium text-primary">Yêu cầu: {item.userPrompt}</span>
                    <div className="flex items-center gap-1 text-[9px] text-text-tertiary">
                      <Clock size={10} />
                      {format(item.timestamp, 'HH:mm, dd/MM/yyyy', { locale: vi })}
                    </div>
                  </div>
                  <IconButton
                    icon={<Trash2 size={16} />}
                    onClick={() => item.id && handleDelete(item.id)}
                    title="Xóa bản tóm tắt"
                    variant="ghost"
                    size="sm"
                    className="text-error hover:!text-error hover:bg-error/10"
                  />
                </div>
                <div className="text-sm text-text-primary leading-[1.6] whitespace-pre-wrap font-medium">
                  {item.summary}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
