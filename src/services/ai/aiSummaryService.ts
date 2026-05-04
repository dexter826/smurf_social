import { GoogleGenerativeAI } from '@google/generative-ai';
import { RtdbMessage, User, MessageType } from '../../../shared/types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export interface AiContext {
  conversationName: string;
  memberCount: number;
  userName: string;
}

/** Kết nối AI để phân tích nội dung chat */
export class AiSummaryService {
  private genAI: any = null;

  /** Khởi tạo kết nối an toàn với Google AI */
  private getGenAI() {
    if (!this.genAI) {
      this.genAI = new GoogleGenerativeAI(API_KEY);
    }
    return this.genAI;
  }

  /** Chuyển đổi dữ liệu chat sang định dạng văn bản thô */
  private formatMessages(messages: Array<{ id: string; data: RtdbMessage }>, usersMap: Record<string, User>, currentUserId: string): string {
    return messages
      .filter(m => !m.data.isRecalled)
      .map(m => {
        const sender = usersMap[m.data.senderId];
        const senderName = m.data.senderId === currentUserId ? 'Tôi' : (sender?.fullName || 'Người dùng ẩn danh');
        
        let content = '';
        switch (m.data.type) {
          case MessageType.TEXT:
            content = m.data.content;
            break;
          case MessageType.IMAGE:
            content = '[Hình ảnh]';
            break;
          case MessageType.VIDEO:
            content = '[Video]';
            break;
          case MessageType.FILE:
            content = `[Tệp đính kèm: ${m.data.media?.[0]?.fileName || 'không tên'}]`;
            break;
          case MessageType.VOICE:
            content = '[Tin nhắn thoại]';
            break;
          case MessageType.CALL:
            content = '[Cuộc gọi]';
            break;
          default:
            content = '[Nội dung khác]';
        }

        return `${senderName}: ${content}`;
      })
      .join('\n');
  }

  /** Tổng hợp và phân tích hội thoại dựa trên ngữ cảnh */
  async generateSummary(
    messages: Array<{ id: string; data: RtdbMessage }>,
    usersMap: Record<string, User>,
    currentUserId: string,
    context: AiContext,
    userPrompt?: string
  ): Promise<string> {
    if (!API_KEY) {
      throw new Error('Chưa cấu hình API Key cho Gemini.');
    }

    const genAIInstance = this.getGenAI();
    const model = genAIInstance.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const recentMessages = [...messages].slice(-50);
    const chatContent = this.formatMessages(recentMessages, usersMap, currentUserId);
    const now = new Date();
    const timeStr = format(now, "HH:mm, EEEE 'ngày' dd/MM/yyyy", { locale: vi });

    const systemRole = `Bạn là trợ lý AI thông minh tích hợp trong ứng dụng Smurf Social. 
Nhiệm vụ của bạn là hỗ trợ người dùng thấu hiểu nội dung trò chuyện.

THÔNG TIN NGỮ CẢNH:
- Cuộc trò chuyện: ${context.conversationName}
- Tổng số thành viên: ${context.memberCount} người
- Người đang yêu cầu: ${context.userName} (trong chat được đánh dấu là "Tôi")
- Thời gian hiện tại: ${timeStr}
- Phạm vi dữ liệu: 50 tin nhắn gần nhất

QUY TẮC BẮT BUỘC:
1. Xác định loại hội thoại: Nếu tổng số thành viên là 2, đây là chat 1-1; nếu > 2, đây là chat nhóm. Hãy điều chỉnh cách trả lời cho phù hợp.
2. Trả lời TRỰC TIẾP, gãy gọn. TUYỆT ĐỐI KHÔNG dùng các câu dẫn robotic như "Dựa trên nội dung...", "Theo như tin nhắn...", "Hiện tại...".
3. Xưng hô với người dùng là "Bạn". Giọng văn tự nhiên, chuyên nghiệp.
4. Luôn đảm bảo tính chính xác dựa trên phạm vi dữ liệu được cung cấp.
5. KHÔNG sử dụng các ký hiệu Markdown (**, #, -). Chỉ trả về văn bản thuần.`;

    const finalPrompt = `
${systemRole}

NỘI DUNG 50 TIN NHẮN GẦN NHẤT (TỪ CŨ ĐẾN MỚI):
${chatContent}

YÊU CẦU CỦA NGƯỜI DÙNG:
${userPrompt || 'Hãy tóm tắt nội dung chính của các tin nhắn này một cách ngắn gọn, súc tích.'}
    `;

    try {
      const result = await model.generateContent(finalPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Lỗi khi gọi Gemini API:', error);
      throw new Error('Không thể kết nối với AI Agent. Vui lòng thử lại sau.');
    }
  }
}

export const aiSummaryService = new AiSummaryService();
