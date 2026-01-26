/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          active: 'var(--color-primary-active)',
          light: 'var(--color-primary-light)',
        },
        sidebar: {
          bg: 'var(--sidebar-bg)',
          item: 'var(--sidebar-item)',
          'item-hover': 'var(--sidebar-item-hover)',
          'item-active': 'var(--sidebar-item-active)',
        },
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          hover: 'var(--bg-hover)',
          'message-sent': 'var(--bg-message-sent)',
          'message-received': 'var(--bg-message-received)',
          overlay: 'var(--bg-overlay)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          inverse: 'var(--text-inverse)',
          link: 'var(--text-link)',
          'on-primary': 'var(--text-on-primary)',
        },
        border: {
          light: 'var(--border-light)',
          medium: 'var(--border-medium)',
        },
        divider: 'var(--divider)',
        success: {
          DEFAULT: 'var(--color-success)',
          light: 'var(--color-success-light)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          light: 'var(--color-error-light)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          light: 'var(--color-warning-light)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          light: 'var(--color-info-light)',
        },
        status: {
          online: 'var(--status-online)',
          offline: 'var(--status-offline)',
          away: 'var(--status-away)',
        },
        badge: {
          bg: 'var(--badge-bg)',
          text: 'var(--badge-text)',
        },
        notification: {
          bg: 'var(--notification-bg)',
          border: 'var(--notification-border)',
        },
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'dropdown': 'var(--shadow-dropdown)',
        'zalo': 'var(--shadow-md)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out forwards',
        'slide-in-right': 'slideInRight 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
}
