export const REACTIONS = ['👍', '❤️', '😆', '😮', '😢', '😡'] as const;

export type ReactionType = typeof REACTIONS[number];

export const REACTION_LABELS: Record<ReactionType, string> = {
  '👍': 'Thích',
  '❤️': 'Yêu thích',
  '😆': 'Haha',
  '😮': 'Wow',
  '😢': 'Buồn',
  '😡': 'Phẫn nộ'
};
