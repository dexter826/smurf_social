/**
 * Lấy chữ cái đầu từ tên (tối đa 2 chữ)
 */
export const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Danh sách cặp màu cho gradient
 */
const gradients = [
  ['#FF6B6B', '#FF8E53'],
  ['#4E54C8', '#8F94FB'],
  ['#11998E', '#38EF7D'],
  ['#FC466B', '#3F5EFB'],
  ['#F2994A', '#F2C94C'],
  ['#56CCF2', '#2F80ED'],
  ['#B122E5', '#FF63DE'],
  ['#00B09B', '#96C93D'],
  ['#642B73', '#C6426E']
];

/**
 * Trả về chuỗi CSS linear-gradient dựa trên seed
 */
export const getAvatarGradient = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  const [c1, c2] = gradients[index];
  return `linear-gradient(135deg, ${c1}, ${c2})`;
};
