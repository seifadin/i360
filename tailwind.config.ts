import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // The shared i360 theme's colours (https://theme.i36o.workers.dev/theme.css),
      // each with the theme's LIGHT value built in as the fallback for when
      // theme.css can't be reached. They follow the chosen theme (system /
      // light / sepia / dark, §7); a change in theme.css reaches the app
      // without a release. Every colour in the app goes through these — no
      // fixed greys or whites (2026-10-21, §15t).
      colors: {
        brand: {
          blue: 'var(--i360-text, #0010CF)',
          green: 'var(--i360-link, #2E8B57)',
          ivory: 'var(--i360-bg, #FAF7F2)',
          highlight: 'var(--i360-hover, #EEF2FF)',
          disabled: 'var(--i360-rule, #CBD5E1)',
          border: 'var(--i360-border, #CBD5E1)',       // edges
          // Dividers in the science list: the theme's line colour at half strength
          // (2026-10-21, §15t), so they stay light in every theme.
          divider: 'color-mix(in srgb, var(--i360-rule, #CBD5E1) 50%, transparent)',
          muted: 'var(--i360-muted, #5A62C9)',         // secondary text, placeholders
          input: 'var(--i360-input, #FAF7F2)',         // text-box backgrounds
          'on-accent': 'var(--i360-on-accent, #FAF7F2)', // text and knobs on blue/green
        },
      },
    },
  },
  plugins: [],
} satisfies Config
