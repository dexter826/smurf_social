import Dexie, { Table } from 'dexie';

export interface ChatSummary {
  id?: number;
  conversationId: string;
  summary: string;
  userPrompt: string;
  timestamp: number;
}

/** Lưu trữ tóm tắt hội thoại cục bộ để tối ưu Token */
export class LocalSummaryDatabase extends Dexie {
  chatSummaries!: Table<ChatSummary>;

  constructor() {
    super('smurf_ai_summaries');
    this.version(1).stores({
      chatSummaries: '++id, conversationId, timestamp'
    });
  }

  /** Ghi lại kết quả AI để xem lại offline */
  async saveSummary(data: Omit<ChatSummary, 'id' | 'timestamp'>) {
    return await this.chatSummaries.add({
      ...data,
      timestamp: Date.now()
    });
  }

  /** Truy xuất danh sách tóm tắt theo dòng thời gian */
  async getHistoryByConversationId(conversationId: string) {
    return await this.chatSummaries
      .where('conversationId')
      .equals(conversationId)
      .reverse()
      .sortBy('timestamp');
  }

  /** Gỡ bỏ bản ghi không còn nhu cầu sử dụng */
  async deleteSummary(id: number) {
    return await this.chatSummaries.delete(id);
  }

  /** Giữ database tinh gọn và bảo vệ quyền riêng tư */
  async cleanupHistory(conversationId: string) {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    await this.chatSummaries
      .where('timestamp')
      .below(thirtyDaysAgo)
      .delete();

    const history = await this.getHistoryByConversationId(conversationId);
    if (history.length > 50) {
      const idsToDelete = history.slice(50).map(item => item.id).filter((id): id is number => id !== undefined);
      if (idsToDelete.length > 0) {
        await this.chatSummaries.bulkDelete(idsToDelete);
      }
    }
  }
}

export const localSummaryDb = new LocalSummaryDatabase();
