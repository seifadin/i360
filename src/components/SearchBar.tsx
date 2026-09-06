import { useState } from 'react'
import { Browser } from '@capacitor/browser'
import {
  Search, Bot, Keyboard,
  PencilSparkles, Minimize2, Languages, BookSearch,
  CircleAlert, CircleQuestionMark, CircleX,
} from 'lucide-react'
import { useAppState } from '@/store/appState'
import { useDataCache } from '@/store/dataCache'
import { isArabic, translateToArabic } from '@/api/translator'
import { computeUseHuawei, resolveOpenMethod, matchesWebList } from '@/hooks/usePlatform'
import { tryOpenNewTab } from '@/lib/openTab'

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
  const { state } = useAppState()
  const { resource, findExegesisUrl } = useDataCache()

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
  const useHuawei = computeUseHuawei(state.useWeb, state.isChina, state.useHMS)
  const keyboardUrl = (useHuawei ? resource?.Huawei_VirtualKeyboard : resource?.Google_VirtualKeyboard) ?? ''
  const botUrl = (useHuawei ? resource?.Huawei_BotSearch : resource?.BotSearch) ?? ''

  // fWebBrowser-equivalent — useWeb-aware WebView/new-tab branching.
  // Returns whether the open succeeded (WebView navigation always does;
  // window.open returns null — or an immediately-closed window — if blocked).
  //
  // context='default' (Search results, Exegesis pages): desktop always opens
  // a new tab regardless of useWeb — the desktop-always-tab rule inside
  // resolveOpenMethod itself. Also consults inWebList/URIschemes via
  // resolveOpenMethod (the same function ScienceGrid.tsx uses). Note
  // (2026-09-03): the in-app route now means @capacitor/browser's overlay,
  // not an iframe — neither route is subject to X-Frame-Options at all
  // anymore, since @capacitor/browser genuinely loads the page rather than
  // embedding it. The tab/in-app distinction is now purely a UX choice
  // (keep this app's own chrome visible vs. leave to a fully separate
  // context), not an embedding-safety one the way it was when Browser.tsx
  // was an iframe page.
  //
  // context='bot': routing is based on useWeb alone, ignoring isDesktop() —
  // identical behavior on any browser, mobile or desktop. Safe to skip the
  // X-Frame-Options safeguard here specifically because Botpress's webchat
  // URL is purpose-built for iframe embedding, not arbitrary content. Still
  // consults inWebList/URIschemes via matchesWebList (not resolveOpenMethod,
  // which would also pull in the desktop check bot deliberately skips) in
  // case a bot URL ever needs to be force-opened in a tab too.
  function openViaWebBrowser(url: string, context: 'default' | 'bot' = 'default'): boolean {
    const uriSchemes = resource?.URIschemes ?? ''
    const inWebList = resource?.inWebList ?? ''

    const useInAppRoute = context === 'bot'
      ? state.useWeb && !matchesWebList(url, uriSchemes, inWebList)
      : state.useWeb && resolveOpenMethod(url, uriSchemes, inWebList) === 'in_app'

    if (useInAppRoute) {
      // Replaces the old navigate('/browser', ...) iframe page — opens
      // the OS's own in-app browser (Custom Tabs/SFSafariViewController)
      // instead, same as ScienceGrid's own resource-opening flow. Fire-
      // and-forget (this function stays synchronous, matching every
      // caller's existing expectation of an immediate boolean) — no
      // synchronous failure signal exists for Browser.open() the way
      // window.open() returning null signals a blocked popup, so this
      // path still reports success unconditionally, same as before.
      Browser.open({ url }).catch(() => {})
      // The setState({ WebAppendix: null }) this replaced only ever
      // existed to reset state Browser.tsx's own paperclip button read —
      // Browser.tsx is no longer the destination for any resource-opening
      // flow at all (see App.tsx/ScienceGrid.tsx), so that state has no
      // remaining consumer.
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
    const [chapterStr, verseStr] = value.split('.')
    const chapter = Number(chapterStr)
    const verse = Number(verseStr)

    if (!Number.isFinite(chapter) || !Number.isFinite(verse) || chapter <= 0 || verse < 0) {
      flashIconFor('invalid')
      return
    }

    // Dot-to-colon normalization — kept for possible future use (e.g. matching
    // tanzil.net's Chapter:Verse convention): `${chapter}:${verse}`.
    // Not currently consumed by anything, so not computed here to avoid dead code.

    const url = findExegesisUrl(chapter, verse)

    if (!url) {
      flashIconFor('notfound')
      return
    }

    const opened = openViaWebBrowser(url)
    if (!opened) flashIconFor('openfailed')
  }

  // fSearchCustom-equivalent. Choreography: Arabic text → BookSearch while
  // opening, then reverts. Non-Arabic text → Languages while translating,
  // then BookSearch while opening, then reverts. CircleX flash only on a
  // genuine open failure; EntityQueryTermOld reset on failure so the same
  // term can be retried. CustomSearch/Huawei_CustomSearch (search engine cx)
  // and Translator (translator endpoint URL) are read from cached i360dbc —
  // wired up this session; both fall back to their VITE_* env var if the
  // Baserow field is empty/not yet loaded.
  async function handleSearch() {
    // Consistently the trimmed value throughout — handleSubmit already
    // validated `trimmed`, so guarding/deduping/translating on the raw
    // untrimmed state here meant "قرآن " and "قرآن" counted as different
    // for the dedupe and shipped stray encoded whitespace into the search
    // URL (caught in the 2026-08-19 review; harmless but inconsistent).
    if (!trimmed) return
    if (trimmed === EntityQueryTermOld) return
    setEntityQueryTermOld(trimmed)

    let arabicTerm = trimmed
    if (!isArabic(trimmed)) {
      setSearchPhase('translating')
      try { arabicTerm = await translateToArabic(trimmed, resource?.Translator) }
      catch { arabicTerm = trimmed }
    }

    setSearchPhase('opening')
    // Baserow's CustomSearch/Huawei_CustomSearch is a complete search-URL
    // template ending in Google CSE's fragment convention (#gsc.q=), meant
    // to have the query appended directly — NOT a bare cx value for a
    // standard ?q= query string, which is a different (and wrong) URL shape.
    // The env-var fallback is built in the same template shape from the cx
    // alone, for consistency with what's actually configured in Baserow.
    const csTemplate = (useHuawei ? resource?.Huawei_CustomSearch : resource?.CustomSearch)
      || `https://cse.google.com/cse?cx=${import.meta.env.VITE_PSE_CX}#gsc.tab=0&gsc.sort=&gsc.q=`
    const pseUrl = `${csTemplate}${encodeURIComponent(arabicTerm)}`
    const opened = openViaWebBrowser(pseUrl)

    setSearchPhase(null)
    if (!opened) {
      setEntityQueryTermOld('')
      flashIconFor('openfailed')
    }
  }

  function handleBot() {
    if (!botUrl) return
    const opened = openViaWebBrowser(botUrl, 'bot')
    if (!opened) triggerBotFailed()
  }

  // Keyboard links are native-app deep links (install/open a keyboard app,
  // or device keyboard settings) — not browsable web pages. Always opens
  // externally, never routes through the useWeb-aware WebView logic.
  function handleKeyboard() {
    if (!keyboardUrl) return
    if (!tryOpenNewTab(keyboardUrl)) triggerKeyboardFailed()
  }

  // Dynamic accessible name for the search-options button — mirrors the
  // exact same conditional chain used below to pick which icon renders, so
  // a screen reader user gets the same information a sighted user reads
  // from the icon changing (previously a static "خيارات البحث" regardless
  // of state — a real gap manual review caught, on top of the Lighthouse-
  // driven fixes, since Lighthouse's automated a11y check only catches a
  // subset of real issues by its own admission).
  // Shared by both computed values below — the flash/searchPhase portion
  // is identical logic for both (same state, same messages), so it's
  // computed once here rather than duplicated in two separate ternary
  // chains. null (not '') when nothing transient applies, so each
  // consumer's own ?? fallback reads clearly as "nothing transient, fall
  // through to my own non-transient default."
  const transientStatus: string | null =
    flash === 'invalid' ? 'إدخال غير صالح' :
    flash === 'notfound' ? 'لم يتم العثور على تفسير لهذه الآية' :
    flash === 'openfailed' ? 'تعذر فتح الرابط' :
    searchPhase === 'translating' ? 'جارٍ الترجمة' :
    searchPhase === 'opening' ? 'جارٍ فتح النتائج' :
    null

  const searchIconLabel = transientStatus ?? (
    overrideArmed ? 'وضع البحث المباشر مفعّل، اضغط للإلغاء' :
    isExegesisMatch ? 'تم اكتشاف رقم آية، اضغط للبحث العادي بدلاً من ذلك' :
    'خيارات البحث'
  )

  // Separate from the button label above: covers only the genuinely
  // transient/ephemeral events (500ms flashes, in-flight phases, plus
  // Bot/Keyboard's own failures) that need proactive announcement
  // regardless of what currently has focus — e.g. an "invalid input"
  // flash appears on THIS icon after tapping Submit, a different button,
  // so nothing here would otherwise reach a screen reader unless it's
  // wrapped in a live region. Empty string when nothing transient is
  // happening, so the live region stays silent by default.
  const liveMessage = transientStatus ?? (
    botFailed ? 'تعذر فتح المساعد الذكي' :
    keyboardFailed ? 'تعذر فتح لوحة المفاتيح' :
    ''
  )

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-brand-ivory border-b border-gray-200">
      {/* Visually hidden, announces the transient states above regardless
          of which element currently has focus. role="status" + explicit
          aria-live="polite" together for the broadest, most reliable
          screen-reader support. */}
      <span className="sr-only" role="status" aria-live="polite">{liveMessage}</span>

      {/* Search input with SearchIcon (right) + Search-execute icon (left) */}
      <div className="flex flex-1 min-w-0 items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 gap-2">
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
          aria-label={searchIconLabel}
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
          id="i360-search"
          name="search"
          value={EntityQueryTerm}
          onChange={e => setEntityQueryTerm(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="بحث ... أو الآية#.السورة#"
          aria-label="بحث"
          // Standard form pattern found on closer review, alongside the
          // three findings above: many screen readers announce "invalid
          // entry" automatically when a focused field has aria-invalid
          // true. Only ever true for the same brief 500ms window the
          // invalid-input flash shows, then clears itself with it.
          aria-invalid={flash === 'invalid'}
          className="min-w-0 flex-1 bg-transparent text-right text-base text-brand-blue outline-none placeholder-gray-400"
          dir="rtl"
        />
        {/* Search icon inside input on LEFT (last in RTL flex = leftmost) */}
        <button onClick={handleSubmit} className="shrink-0 text-brand-blue" aria-label="بحث">
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
