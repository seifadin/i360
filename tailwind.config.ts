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
          green: '#1A5C38',
          gold: '#C9A96E',
          ivory: '#FAF7F2',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
