// The shared i360 theme in the app (2026-10-21, §15t): the two shared choices —
// theme (system / light / sepia / dark) and numerals (0123 · ٠١٢٣ · ۰۱۲۳) — from
// the one loader every i360 page uses (hub/theme/site/theme-loader.js, bundled
// in, so the buttons also work offline). The choices are stored per site, so
// the app and the pages merged into it share them.
import * as i360Theme from '@i360/theme-loader'

export { i360Theme }

// Numerals everywhere: every digit the app shows — visible text, and the
// placeholder, tooltip and screen-reader attributes — is written in the chosen
// numerals, including text drawn later, with the loader's watchNumerals() (the
// same function as the hub pages). Display only: what the user types is never
// touched (text boxes are skipped), and anything marked
// data-i360-digits="keep" stays as it is (the numerals button's own labels,
// technical identifiers).
const KEEP = '[data-i360-digits="keep"]'

let started = false

/** Start the theme (saved choice, live theme.css, other-tab changes) and numerals everywhere. Once. */
export function startTheme() {
  if (started) return
  started = true
  // init() never rejects: it falls back to the saved copy, then to the app's own colours.
  void i360Theme.init()
  i360Theme.watchNumerals(document.body, {
    skip: `script, style, textarea, ${KEEP}`,
    attributes: ['placeholder', 'title', 'aria-label'],
    attributeSkip: KEEP,
  })
}
