// Hằng số theme


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
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    primaryActive: '#1d4ed8',
    
    sidebar: {
      bg: '#080a0f',
      item: 'rgba(248, 250, 252, 0.65)',
      itemHover: 'rgba(248, 250, 252, 0.08)',
      itemActive: 'rgba(248, 250, 252, 0.12)',
    },
    
    background: {
      primary: '#0b0e14',
      secondary: '#14181f',
      tertiary: '#1e242d',
      hover: '#1e2530',
      active: '#28303d',
      chat: '#0b0e14',
      messageSent: '#3b82f6',
      messageReceived: '#1e242d',
      overlay: 'rgba(0, 0, 0, 0.75)',
    },
    
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
      tertiary: '#64748b',
      inverse: '#0b0e14',
      link: '#60a5fa',
      onPrimary: '#ffffff',
    },
    
    border: {
      light: '#1e2530',
      medium: '#2d333b',
      dark: '#484f58',
      divider: '#1e2530',
    },
    
    status: {
      success: '#10b981',
      successLight: 'rgba(16, 185, 129, 0.1)',
      error: '#ef4444',
      errorLight: 'rgba(239, 68, 68, 0.1)',
      warning: '#f59e0b',
      warningLight: 'rgba(245, 158, 11, 0.1)',
      info: '#3b82f6',
      infoLight: 'rgba(59, 130, 246, 0.1)',
      online: '#10b981',
      offline: '#484f58',
      away: '#f59e0b',
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
  custom: '0 2px 8px 0 rgba(0, 0, 0, 0.08)',
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

export const THEME_GRADIENTS = [
  ['#FF6B6B', '#FF8E53'],
  ['#4E54C8', '#8F94FB'],
  ['#11998E', '#38EF7D'],
  ['#FC466B', '#3F5EFB'],
  ['#F2994A', '#F2C94C'],
  ['#56CCF2', '#2F80ED'],
  ['#B122E5', '#FF63DE'],
  ['#00B09B', '#96C93D'],
  ['#642B73', '#C6426E']
] as const;
