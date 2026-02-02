export const REACTIONS = ['👍', '❤️', '😆', '😮', '😢', '😡'] as const;

export const REACTION_LABELS: Record<string, string> = {
  '👍': 'Thích',
  '❤️': 'Yêu thích',
  '😆': 'Haha',
  '😮': 'Wow',
  '😢': 'Buồn',
  '😡': 'Phẫn nộ'
};

export type ReactionType = typeof REACTIONS[number];
