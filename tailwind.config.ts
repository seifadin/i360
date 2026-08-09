import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#0010CF',
          green: '#2E8B57',
          ivory: '#FAF7F2',
          highlight: '#EEF2FF',
          disabled: '#CBD5E1',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
