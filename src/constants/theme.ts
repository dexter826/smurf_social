/**
 * Theme Constants
 * Hằng số màu sắc và theme cho toàn bộ ứng dụng
 */

export const THEME_COLORS = {
  light: {
    primary: '#0068ff',
    primaryHover: '#0056d6',
    primaryActive: '#0047b3',
    
    sidebar: {
      bg: '#0068ff',
      item: 'rgba(255, 255, 255, 0.7)',
      itemHover: 'rgba(0, 0, 0, 0.1)',
      itemActive: 'rgba(0, 0, 0, 0.15)',
    },
    
    background: {
      primary: '#ffffff',
      secondary: '#f4f6f8',
      tertiary: '#e9ebef',
      hover: '#f0f2f5',
      active: '#e4e6eb',
      chat: '#ffffff',
      messageSent: '#0068ff',
      messageReceived: '#e9ebef',
      overlay: 'rgba(0, 0, 0, 0.4)',
    },
    
    text: {
      primary: '#081c36',
      secondary: '#7589a3',
      tertiary: '#a0aec0',
      inverse: '#ffffff',
      link: '#0068ff',
      onPrimary: '#ffffff',
    },
    
    border: {
      light: '#e4e6eb',
      medium: '#d1d5db',
      dark: '#9ca3af',
      divider: '#e9ebef',
    },
    
    status: {
      success: '#10b981',
      successLight: '#d1fae5',
      error: '#ef4444',
      errorLight: '#fee2e2',
      warning: '#f59e0b',
      warningLight: '#fef3c7',
      info: '#3b82f6',
      infoLight: '#dbeafe',
      online: '#10b981',
      offline: '#9ca3af',
      away: '#f59e0b',
    },
    
    badge: {
      bg: '#ef4444',
      text: '#ffffff',
    },
  },
  
  dark: {
    primary: '#3b8fff',
    primaryHover: '#579fff',
    primaryActive: '#73afff',
    
    sidebar: {
      bg: '#1c2738',
      item: 'rgba(255, 255, 255, 0.6)',
      itemHover: 'rgba(255, 255, 255, 0.08)',
      itemActive: 'rgba(255, 255, 255, 0.12)',
    },
    
    background: {
      primary: '#0d1117',
      secondary: '#161b22',
      tertiary: '#21262d',
      hover: '#1c2128',
      active: '#262c36',
      chat: '#0d1117',
      messageSent: '#3b8fff',
      messageReceived: '#262c36',
      overlay: 'rgba(0, 0, 0, 0.6)',
    },
    
    text: {
      primary: '#e6edf3',
      secondary: '#8b949e',
      tertiary: '#6e7681',
      inverse: '#0d1117',
      link: '#58a6ff',
      onPrimary: '#ffffff',
    },
    
    border: {
      light: '#30363d',
      medium: '#484f58',
      dark: '#6e7681',
      divider: '#21262d',
    },
    
    status: {
      success: '#3fb950',
      successLight: '#1b3a25',
      error: '#f85149',
      errorLight: '#3d1f1f',
      warning: '#d29922',
      warningLight: '#3d2e1a',
      info: '#58a6ff',
      infoLight: '#1f3551',
      online: '#3fb950',
      offline: '#6e7681',
      away: '#d29922',
    },
    
    badge: {
      bg: '#f85149',
      text: '#ffffff',
    },
  },
} as const;

export const THEME_SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 2px 8px 0 rgba(0, 0, 0, 0.08)',
  lg: '0 4px 16px 0 rgba(0, 0, 0, 0.12)',
  dropdown: '0 8px 24px rgba(0, 0, 0, 0.15)',
  zalo: '0 2px 8px 0 rgba(0, 0, 0, 0.08)',
} as const;

export const THEME_TRANSITIONS = {
  fast: '0.15s ease',
  normal: '0.2s ease',
  slow: '0.3s ease',
  theme: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease',
} as const;

export const THEME_BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const THEME_SPACING = {
  sidebar: {
    width: '64px',
    widthExpanded: '240px',
  },
  topbar: {
    height: '56px',
  },
  bottomNav: {
    height: '60px',
  },
} as const;
