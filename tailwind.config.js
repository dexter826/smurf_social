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
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          500: 'var(--color-primary)',
          600: 'var(--color-primary-dark)',
        },
        bg: {
          main: 'var(--bg-main)',
          secondary: 'var(--bg-secondary)',
          hover: 'var(--bg-hover)',
        },
        text: {
          main: 'var(--text-main)',
          secondary: 'var(--text-secondary)',
        }
      },
      boxShadow: {
        'zalo': '0 0 10px 0 rgba(0,0,0,0.05)',
        'card': '0 1px 2px rgba(0,0,0,0.06)',
      }
    },
  },
  plugins: [],
}
