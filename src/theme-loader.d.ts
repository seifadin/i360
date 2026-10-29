// Types for the shared i360 theme loader — hub/theme/site/theme-loader.js, the
// one file every i360 page uses (claude/i360-hub.md §3). The app imports it
// through the '@i360/theme-loader' alias in vite.config.ts, which bundles it
// with its `import.meta.url` pointed at the theme site (§15t). Plain JS, so
// its shape is declared here; keep it in step with that file's exports.
declare module '@i360/theme-loader' {
  export type ThemeChoice = 'system' | 'light' | 'sepia' | 'dark'
  export type ThemePalette = 'light' | 'sepia' | 'dark'
  export type Numerals = 'western' | 'arabic' | 'persian'

  export const THEMES: readonly ThemeChoice[]
  export const NUMERALS: readonly Numerals[]
  export const NUMERALS_KEY: string
  export const CHOICE_KEY: string
  export const CACHE_KEY: string
  export const CSS_URL: string

  export type ButtonLabels = { theme: Record<ThemeChoice, string>; numerals: Record<Numerals, string> }
  export const NUMERALS_SAMPLE: Readonly<Record<Numerals, string>>
  export const LABELS: Readonly<Record<'ar' | 'en' | 'tr' | 'id' | 'ur', ButtonLabels>>
  export function themeLabel(choice: ThemeChoice, lang?: string): string
  export function numeralsLabel(numerals: Numerals, lang?: string): string

  export function getChoice(): ThemeChoice
  export function getTheme(choice?: ThemeChoice): ThemePalette
  export function setChoice(choice: ThemeChoice): { choice: ThemeChoice; theme: ThemePalette }
  export function cycle(): { choice: ThemeChoice; theme: ThemePalette }
  export function onChange(fn: (s: { choice: ThemeChoice; theme: ThemePalette; changed: boolean }) => void): () => void

  export function getNumerals(): Numerals
  export function toNumerals(text: string, numerals?: Numerals): string
  export function setNumerals(numerals: Numerals): { numerals: Numerals }
  export function cycleNumerals(): { numerals: Numerals }
  export function onNumeralsChange(fn: (s: { numerals: Numerals }) => void): () => void

  export function init(): Promise<{ choice: ThemeChoice; theme: ThemePalette; source: 'network' | 'cache' | 'fallback' }>
}
