import { format, formatDistanceToNow, isYesterday, isToday, differenceInDays, getYear } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Chuyển đổi các định dạng thời gian (Date, Timestamp, ISO) sang Date object.
 */
export const toDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (val.seconds) return new Date(val.seconds * 1000);
  const date = new Date(val);
  return isNaN(date.getTime()) ? null : date;
};

// Hiển thị thời gian thu gọn kiểu Facebook
export const formatRelativeTime = (date: Date | number | string): string => {
  const d = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Vừa xong';

  const days = differenceInDays(now, d);
  if (days >= 7) {
    const isSameYear = getYear(d) === getYear(now);
    const dateFormat = isSameYear ? 'dd/MM' : 'dd/MM/yyyy';
    return `${format(d, dateFormat)} lúc ${format(d, 'HH:mm')}`;
  }

  const timeStr = formatDistanceToNow(d, { locale: vi });
  
  // Chuẩn hóa thành cụm từ ngắn gọn
  return timeStr
    .replace('khoảng ', '')
    .replace('một ', '1 ')
    .replace('dưới 1 phút', 'Vừa xong');
};

// Định dạng thời gian hội thoại
export const formatChatTime = (date: Date | number | string): string => {
  const d = new Date(date);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Hôm qua';
  
  if (differenceInDays(new Date(), d) < 7) {
    return format(d, 'eeee', { locale: vi });
  }

  return format(d, 'dd/MM/yyyy');
};

// Trạng thái hoạt động người dùng
export const formatStatusTime = (date: Date | number | string): string => {
  const d = new Date(date);
  const now = new Date();
  
  if (differenceInDays(now, d) >= 7) {
    return `Hoạt động ngày ${format(d, 'dd/MM/yyyy')}`;
  }

  const timeAgo = formatDistanceToNow(d, { addSuffix: true, locale: vi });
  return `Hoạt động ${timeAgo}`;
};

// Định dạng đầy đủ cho tooltip
export const formatDateTime = (date: Date | number | string): string => {
  return format(new Date(date), 'HH:mm dd/MM/yyyy');
};

// Chỉ hiển thị giờ và phút
export const formatTimeOnly = (date: Date | number | string): string => {
  return format(new Date(date), 'HH:mm');
};
