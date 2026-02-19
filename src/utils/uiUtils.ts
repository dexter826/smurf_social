import { RefObject } from 'react';

// Cuộn đến tin nhắn và hiệu ứng highlight
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

export const getLastName = (fullName?: string) =>
  fullName?.trim().split(' ').pop() || '';

export const insertTextAtCursor = (
  ref: RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
  currentText: string,
  text: string,
  onUpdate: (newText: string) => void
) => {
  const start = ref.current?.selectionStart || 0;
  const end = ref.current?.selectionEnd || 0;
  const newText = currentText.substring(0, start) + text + currentText.substring(end);
  onUpdate(newText);
  setTimeout(() => {
    const newPos = start + text.length;
    ref.current?.focus();
    ref.current?.setSelectionRange(newPos, newPos);
  }, 0);
};
