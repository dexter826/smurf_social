import { format, formatDistanceToNow, isYesterday, isToday, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Định dạng thời gian tương đối (Feed, Comment, Notification)
 */
export const formatRelativeTime = (date: Date | number | string): string => {
  const d = new Date(date);
  const diffInSeconds = Math.floor((new Date().getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Vừa xong';

  return formatDistanceToNow(d, {
    locale: {
      ...vi,
      formatDistance: (token, count) => {
        const formatRelativeLocale: { [key: string]: string } = {
          lessThanXSeconds: 'vừa xong',
          xSeconds: 'vừa xong',
          halfAMinute: 'vừa xong',
          lessThanXMinutes: '{{count}} phút',
          xMinutes: '{{count}} phút',
          aboutXHours: '{{count}} giờ',
          xHours: '{{count}} giờ',
          xDays: '{{count}} ngày',
          aboutXMonths: '{{count}} tháng',
          xMonths: '{{count}} tháng',
          aboutXYears: '{{count}} năm',
          xYears: '{{count}} năm',
        };
        return formatRelativeLocale[token].replace('{{count}}', count.toString());
      },
    },
  });
};

/**
 * Định dạng thời gian cho Chat List/Conversation
 */
export const formatChatTime = (date: Date | number | string): string => {
  const d = new Date(date);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Hôm qua';
  
  // Trong vòng 7 ngày thì hiện thứ
  if (differenceInDays(new Date(), d) < 7) {
    return format(d, 'eeee', { locale: vi });
  }

  return format(d, 'dd/MM/yyyy');
};

/**
 * Định dạng thời gian cho User Status (Online/Last Seen)
 */
export const formatStatusTime = (date: Date | number | string): string => {
  const d = new Date(date);
  const timeAgo = formatDistanceToNow(d, { addSuffix: true, locale: vi });
  return `Hoạt động ${timeAgo}`;
};

/**
 * Định dạng giờ phút ( HH:mm )
 */
export const formatTimeOnly = (date: Date | number | string): string => {
  return format(new Date(date), 'HH:mm');
};
