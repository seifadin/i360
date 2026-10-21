// The shared i360 theme in the app (2026-10-21, §15t): the two shared choices —
// theme (system / light / sepia / dark) and numerals (0123 · ٠١٢٣ · ۰۱۲۳) — from
// the one loader every i360 page uses (hub/theme/site/theme-loader.js, bundled
// in, so the buttons also work offline). The choices are stored per site, so
// the app and the pages merged into it share them.
import * as i360Theme from '@i360/theme-loader'

export { i360Theme }

// Numerals everywhere: every digit the app shows — visible text, and the
// placeholder, tooltip and screen-reader attributes — is written in the chosen
// numerals, including text drawn later (the same approach as Daily
// Reflection's, i360-hub.md §4). Display only: what the user types is never
// touched (text boxes are skipped), and anything marked
// data-i360-digits="keep" stays as it is (the numerals button's own labels,
// technical identifiers).
const DIGIT = /[0-9٠-٩۰-۹]/
const ATTRIBUTES = ['placeholder', 'title', 'aria-label']
const KEEP = '[data-i360-digits="keep"]'
const SKIP_TEXT = `script, style, textarea, ${KEEP}`

function fixText(node: Text) {
  const parent = node.parentElement
  if (!parent || parent.closest(SKIP_TEXT)) return
  const value = node.nodeValue ?? ''
  if (!DIGIT.test(value)) return
  const next = i360Theme.toNumerals(value)
  if (next !== value) node.nodeValue = next
}

function fixAttributes(el: Element) {
  if (el.closest(KEEP)) return
  for (const name of ATTRIBUTES) {
    const value = el.getAttribute(name)
    if (value === null || !DIGIT.test(value)) continue
    const next = i360Theme.toNumerals(value)
    if (next !== value) el.setAttribute(name, next)
  }
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    fixText(root as Text)
    return
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return
  fixAttributes(root as Element)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) fixText(n as Text)
    else fixAttributes(n as Element)
  }
}

let started = false

/** Start the theme (saved choice, live theme.css, other-tab changes) and numerals everywhere. Once. */
export function startTheme() {
  if (started) return
  started = true
  // init() never rejects: it falls back to the saved copy, then to the app's own colours.
  void i360Theme.init()
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') fixText(m.target as Text)
      else if (m.type === 'attributes') fixAttributes(m.target as Element)
      else m.addedNodes.forEach(walk)
    }
  }).observe(document.body, {
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRIBUTES,
    subtree: true,
  })
  walk(document.body)
  i360Theme.onNumeralsChange(() => walk(document.body))
}
