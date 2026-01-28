import { THEME_GRADIENTS } from '../constants/theme';

// Lấy chữ cái đầu (tối đa 2 ký tự)
export const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Tạo màu gradient từ seed
export const getAvatarGradient = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradients = THEME_GRADIENTS;
  const index = Math.abs(hash) % gradients.length;
  const [c1, c2] = gradients[index];
  return `linear-gradient(135deg, ${c1}, ${c2})`;
};
