/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        liberal: {
          DEFAULT: '#2196F3',
          dark: '#1565C0',
          light: '#64B5F6',
        },
        fascist: {
          DEFAULT: '#E53935',
          dark: '#B71C1C',
          light: '#EF5350',
        },
        hitler: {
          DEFAULT: '#FF6F00',
        },
        board: {
          bg: '#1a1a2e',
          card: '#16213e',
          surface: '#0f3460',
        },
      },
    },
  },
  plugins: [],
};
