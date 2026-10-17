import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // The shared i360 theme's colours (https://theme.i36o.workers.dev/theme.css,
      // light — the app is light-only, §7), each with today's value built in as
      // the fallback for when theme.css can't be reached. Same values: no
      // visible change; a future change in theme.css reaches the app without
      // a release.
      colors: {
        brand: {
          blue: 'var(--i360-text, #0010CF)',
          green: 'var(--i360-link, #2E8B57)',
          ivory: 'var(--i360-bg, #FAF7F2)',
          highlight: 'var(--i360-hover, #EEF2FF)',
          disabled: 'var(--i360-rule, #CBD5E1)',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
