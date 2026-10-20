/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        lavender: {
          50: '#FAF8FF',
          100: '#F4F0FF', // Main background (Light)
          200: '#E4DCFF', // Soft surface (Light)
          300: '#CEBFFF',
          400: '#B096FF',
          500: '#8565E8', // Primary purple
          600: '#714DE0',
          700: '#5C34D6',
          800: '#461EBF',
          900: '#341496',
          950: '#150A3D',
        },
        sky: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#53B8F5', // Accent sky blue
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
        },
        darkSurface: {
          bg: '#120E24', // Main background (Dark)
          card: '#1C1635', // Card surface (Dark)
          cardHover: '#251E44',
          border: '#2E2554', // Border (Dark)
          borderLight: '#3E326D',
          muted: '#9F95C4',
        },
        brand: {
          50: '#F4F0FF',
          100: '#E4DCFF',
          200: '#CEBFFF',
          500: '#8565E8',
          600: '#714DE0',
          700: '#5C34D6',
        },
        tactile: {
          canvas: '#F5F2EB',
          workspace: '#FCFBF9',
          sidebar: '#EFECE6',
          text: '#1C1B18',
          textSecondary: '#5C5952',
          textMuted: '#6E6A61',
          border: '#E4E0D8',
          borderSubtle: '#EDEAE3',
          peach: '#FDF2EC',
          peachAccent: '#F47B55',
          sky: '#EDF5FD',
          skyAccent: '#5B9CF6',
          mint: '#EEF9F2',
          mintAccent: '#34A866',
          lavender: '#F2F0FC',
          lavenderAccent: '#6C5CE7',
          darkCanvas: '#181715',
          darkWorkspace: '#211F1D',
          darkSidebar: '#1C1A17',
          darkText: '#F5F2EB',
          darkTextSecondary: '#B5B0A4',
          darkTextMuted: '#8E8A80',
          darkBorder: '#33302B',
          darkBorderSubtle: '#292622',
        },
      },
      boxShadow: {
        'soft-purple': '0 4px 20px -2px rgba(133, 101, 232, 0.15)',
        'glow-purple': '0 0 25px rgba(133, 101, 232, 0.35)',
      },
    },
  },
  plugins: [],
};
