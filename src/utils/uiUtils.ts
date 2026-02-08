/**
 * Cuộn đến một tin nhắn cụ thể và hiển thị hiệu ứng highlight
 * @param messageId ID của tin nhắn cần cuộn tới
 */
export const scrollToMessage = (messageId: string) => {
  const element = document.getElementById(`msg-${messageId}`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.classList.add('animate-highlight');
    
    // Xóa class highlight sau khi hiệu ứng kết thúc
    setTimeout(() => {
      element.classList.remove('animate-highlight');
    }, 2000);
  }
};
