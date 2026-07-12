import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Bot, Keyboard,
  PencilSparkles, Minimize2, Languages, BookSearch,
  CircleAlert, CircleQuestionMark, CircleX,
} from 'lucide-react'
import { useAppState } from '@/store/appState'
import { useDataCache } from '@/store/dataCache'
import { isArabic, translateToArabic } from '@/api/translator'
import { isDesktop } from '@/hooks/usePlatform'

// Icon mapping confirmation:
// Search   → search icon inside input LEFT side
// Bot      → AI assistant outside input LEFT of it
// Keyboard → virtual keyboard outside leftmost

// Strict full-string match only — a substring like "تفسير آية 2.255" does NOT
// trigger exegesis, only a pure digits.digits string does.
const EXEGESIS_PATTERN = /^\d+\.\d+$/

// 'invalid': malformed chapter.verse input (exegesis only).
// 'notfound': valid input, but no exegesis match exists (exegesis only) —
// genuinely "no matching data," distinct from an open failure below.
// 'openfailed': the browser action itself failed (popup blocked) — used by
// every path that calls openViaWebBrowser, regardless of why it got there.
type FlashIcon = 'invalid' | 'notfound' | 'openfailed' | null
type SearchPhase = 'translating' | 'opening' | null

// Small reusable brief-flash helper for Bot/Keyboard — they have no other
// icon states, just "normal" vs. "briefly show a failure icon."
function useBriefFlash(durationMs = 500): [boolean, () => void] {
  const [active, setActive] = useState(false)
  function trigger() {
    setActive(true)
    setTimeout(() => setActive(false), durationMs)
  }
  return [active, trigger]
}

export default function SearchBar() {
  const { state, setState } = useAppState()
  const { resource, findExegesisUrl } = useDataCache()
  const navigate = useNavigate()

  const [EntityQueryTerm, setEntityQueryTerm] = useState('')
  const [EntityQueryTermOld, setEntityQueryTermOld] = useState('')

  // One-shot forced-search-only override — armed by tapping SearchIcon.
  // Bypasses pattern detection for the NEXT submission only, then reverts.
  const [overrideArmed, setOverrideArmed] = useState(false)

  // Brief post-submit flash (~500ms) — overrides the live icon momentarily
  // to signal invalid input or no exegesis match, then reverts automatically.
  const [flash, setFlash] = useState<FlashIcon>(null)

  // Two distinct in-flight phases for the custom-search path:
  // 'translating' (Languages) — only for non-Arabic text, during the MS
  // Translator call. 'opening' (BookSearch) — always, while resolving/opening
  // the URL. Arabic text skips straight to 'opening'. Never used for the
  // exegesis path, which is a synchronous local lookup with no "in flight" state.
  const [searchPhase, setSearchPhase] = useState<SearchPhase>(null)

  const trimmed = EntityQueryTerm.trim()
  const isExegesisMatch = EXEGESIS_PATTERN.test(trimmed)

  function handleSearchIconTap() {
    setOverrideArmed(prev => !prev)
  }

  function flashIconFor(kind: 'invalid' | 'notfound' | 'openfailed') {
    setFlash(kind)
    setTimeout(() => setFlash(null), 500)
  }

  const [botFailed, triggerBotFailed] = useBriefFlash()
  const [keyboardFailed, triggerKeyboardFailed] = useBriefFlash()

  // Keyboard + Bot URLs — derived from the cached i360dbc record (no fetch here)
  const useHuawei = state.isChina || state.useHMS
  const keyboardUrl = (useHuawei ? resource?.Huawei_VirtualKeyboard : resource?.Google_VirtualKeyboard) ?? ''
  const botUrl = (useHuawei ? resource?.Huawei_BotSearch : resource?.BotSearch) ?? ''

  // Opens a new tab and detects a blocked popup properly — some browsers
  // return a non-null window reference even when blocked, immediately
  // closing it rather than returning null outright. Checking .closed
  // catches that case too, not just the null case. A fully-sandboxed
  // context (e.g. an iframe preview with no allow-popups) can make
  // window.open throw outright instead — without this try/catch, that
  // would silently crash the click handler with zero visible feedback,
  // which matches "not clickable at all" more than a simple blocked popup.
  function tryOpenNewTab(url: string): boolean {
    try {
      const win = window.open(url, '_blank')
      if (!win) return false
      return !win.closed
    } catch {
      return false
    }
  }

  // fWebBrowser-equivalent — useWeb-aware WebView/new-tab branching.
  // Desktop always opens a new tab regardless of useWeb — WebView/iframe is
  // mobile-only, matching the same short-circuit already used in ScienceGrid.tsx.
  // Returns whether the open succeeded (WebView navigation always does;
  // window.open returns null — or an immediately-closed window — if blocked).
  function openViaWebBrowser(url: string): boolean {
    if (state.useWeb && !isDesktop()) {
      setState({ WebAppendix: null, ScienceMinorId: 0 })
      navigate('/browser', { state: { url } })
      return true
    } else {
      return tryOpenNewTab(url)
    }
  }

  async function handleSubmit() {
    if (!trimmed) {
      flashIconFor('invalid')
      return
    }

    const routeToExegesis = !overrideArmed && isExegesisMatch
    if (overrideArmed) setOverrideArmed(false) // one-shot — consumed on submit

    if (routeToExegesis) {
      handleExegesisSubmit(trimmed)
    } else {
      await handleSearch()
    }
  }

  // fExegesis-equivalent — chapter.verse dot format, chapter=split[0], verse=split[1]
  function handleExegesisSubmit(value: string) {
    setState({ QuranId: value })

    const [chapterStr, verseStr] = value.split('.')
    const chapter = Number(chapterStr)
    const verse = Number(verseStr)

    if (!Number.isFinite(chapter) || !Number.isFinite(verse) || chapter <= 0 || verse < 0) {
      flashIconFor('invalid')
      return
    }

    setState({ QuranChapter: chapter, QuranVerse: verse })

    // Dot-to-colon normalization — kept for possible future use (e.g. matching
    // tanzil.net's Chapter:Verse convention): `${chapter}:${verse}`.
    // Not currently consumed by anything, so not computed here to avoid dead code.

    const url = findExegesisUrl(chapter, verse)
    setState({ ExegesisURL: url })

    if (!url) {
      flashIconFor('notfound')
      return
    }

    const opened = openViaWebBrowser(url)
    if (!opened) flashIconFor('openfailed')
  }

  // fSearchCustom-equivalent — core logic unchanged from Phase 7a.
  // Choreography: Arabic text → BookSearch while opening, then reverts.
  // Non-Arabic text → Languages while translating, then BookSearch while
  // opening, then reverts. CircleX flash only on a genuine open failure;
  // EntityQueryTermOld reset on failure so the same term can be retried.
  async function handleSearch() {
    if (!EntityQueryTerm.trim()) return
    if (EntityQueryTerm === EntityQueryTermOld) return
    setEntityQueryTermOld(EntityQueryTerm)

    let arabicTerm = EntityQueryTerm
    if (!isArabic(EntityQueryTerm)) {
      setSearchPhase('translating')
      try { arabicTerm = await translateToArabic(EntityQueryTerm) }
      catch { arabicTerm = EntityQueryTerm }
    }

    setSearchPhase('opening')
    const cx = import.meta.env.VITE_PSE_CX
    const pseUrl = `https://cse.google.com/cse?cx=${cx}&q=${encodeURIComponent(arabicTerm)}`
    const opened = openViaWebBrowser(pseUrl)

    setSearchPhase(null)
    if (!opened) {
      setEntityQueryTermOld('')
      flashIconFor('openfailed')
    }
  }

  function handleBot() {
    if (!botUrl) return
    const opened = openViaWebBrowser(botUrl)
    if (!opened) triggerBotFailed()
  }

  // Keyboard links are native-app deep links (install/open a keyboard app,
  // or device keyboard settings) — not browsable web pages. Always opens
  // externally, never routes through the useWeb-aware WebView logic.
  function handleKeyboard() {
    if (!keyboardUrl) return
    if (!tryOpenNewTab(keyboardUrl)) triggerKeyboardFailed()
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-brand-ivory border-b border-gray-200">

      {/* Search input with SearchIcon (right) + Search-execute icon (left) */}
      <div className="flex flex-1 items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 gap-2">
        {/* SearchIcon — live 3-state indicator + one-shot override control.
            PencilSparkles: auto-detect, input doesn't match (resting/default,
            including empty input). Tapping while empty flashes CircleAlert.
            Languages: auto-detect, input matches chapter.verse live — OR
            custom-search translating a non-Arabic term (in flight).
            Minimize2: forced search-only override armed (tap to arm/disarm).
            BookSearch: custom search opening the resolved URL (in flight). */}
        <button
          onClick={handleSearchIconTap}
          className="shrink-0 text-brand-blue"
          aria-label="خيارات البحث"
        >
          {flash === 'invalid' && <CircleAlert size={17} />}
          {flash === 'notfound' && (
            <CircleQuestionMark size={17} className="-scale-x-100" />
          )}
          {flash === 'openfailed' && <CircleX size={17} />}
          {!flash && searchPhase === 'translating' && <Languages size={17} />}
          {!flash && searchPhase === 'opening' && <BookSearch size={17} />}
          {!flash && !searchPhase && overrideArmed && <Minimize2 size={17} />}
          {!flash && !searchPhase && !overrideArmed && isExegesisMatch && <Languages size={17} />}
          {!flash && !searchPhase && !overrideArmed && !isExegesisMatch && <PencilSparkles size={17} />}
        </button>

        <input
          type="text"
          value={EntityQueryTerm}
          onChange={e => setEntityQueryTerm(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="بحث ... أو الآية#.السورة#"
          className="flex-1 bg-transparent text-right text-sm text-brand-blue outline-none placeholder-gray-400"
          dir="rtl"
        />
        {/* Search icon inside input on LEFT (last in RTL flex = leftmost) */}
        <button onClick={handleSubmit} className="text-brand-blue" aria-label="بحث">
          <Search size={17} />
        </button>
      </div>

      {/* Bot — outside input LEFT */}
      <button
        onClick={handleBot}
        className={`shrink-0 p-1 ${botUrl ? 'text-brand-blue' : 'text-brand-disabled'}`}
        disabled={!botUrl}
        aria-label="المساعد الذكي"
      >
        {botFailed ? <CircleX size={20} /> : <Bot size={20} />}
      </button>

      {/* Keyboard — leftmost */}
      <button
        onClick={handleKeyboard}
        className={`shrink-0 p-1 ${keyboardUrl ? 'text-brand-blue' : 'text-brand-disabled'}`}
        disabled={!keyboardUrl}
        aria-label="لوحة المفاتيح"
      >
        {keyboardFailed ? <CircleX size={20} /> : <Keyboard size={20} />}
      </button>
    </div>
  )
}
