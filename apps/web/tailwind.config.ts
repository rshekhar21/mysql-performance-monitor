import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: '#f7f8fa',
        ink: '#17202a',
        muted: '#667085',
        brand: '#1f7a8c',
        success: '#087f5b',
        warning: '#b7791f',
        critical: '#c92a2a'
      }
    }
  },
  plugins: []
} satisfies Config;
