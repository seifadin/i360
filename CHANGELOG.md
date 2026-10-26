# Changelog

All notable changes to **i360إ** (الموسوعة الإسلامية) are documented in this file.

i360إ is an Arabic-only Islamic knowledge discovery app that organizes Islamic resources — apps, websites, and books — by discipline (Qur'an, Tafsir, Tajweed, Hadith, and more), aggregated from several content sources into a single searchable interface.

---

## [Unreleased] — live on the web and over the air (still version 0.14.0)

### Changed
- The Daily Reflection uses wide screens: where two columns fit, the verse and the hadith sit on one side and prayer times above the upcoming events on the other, the events list scrolling within the column's height; on phones it stays one column, with a little less padding inside the cards (2026-10-26)
- The Daily Reflection's credits are on two lines too (city data; prayer-time calculation), in all five languages (2026-10-26)
- The Daily Reflection's privacy line is on two lines, in all five languages: prayer times are calculated on your device; only the name of the city being searched is sent to Open-Meteo (2026-10-26)
- The Markdown Reader's top bar uses wide screens again: where there's room, bookmark, «الصفحة الأصلية» and reading mode, then zoom, then text size come out of the ⋮ menu onto the bar, and go back into it as the window narrows. «نسخ رابط هذه الصفحة» moved from the contents panel onto the bar, next to the page arrows (2026-10-26)
- The encyclopedia's web address is now https://i36o.web.app/ (2026-10-23). The old address https://i360-e.web.app/ and all older ones lead there, links and pages included; on the web, saved choices start fresh once, and an encyclopedia installed from the browser needs installing again
- The i360 tools now have one address, the encyclopedia's own: the Reader at https://i360-e.web.app/md/, the book search at /cse/ and the Daily Reflection at /day/. The old addresses (i360-hub.web.app, i360-md.web.app, i360-cse.web.app, i360-day.web.app) lead there, links and pages included; on the web, saved choices there (theme, numerals, bookmarks, reading positions, city) start fresh once (2026-10-23)
- The Daily Reflection has a bar at the top, like the other i360 pages: theme, numerals and a language button (it opens the list of the five languages), the page's name and, inside the app, the close button. On iPhone the bar stays clear of the status bar (2026-10-22)
- The theme button now comes before the numerals button on every page, the encyclopedia's bottom bar included (2026-10-22)
- The book search is now called «البحث في i360إ» (2026-10-22)
- The Markdown Reader («القارئ») has the same kind of top bar: menu, theme and numerals, a connection icon (green online, red offline), «فتح ملف», the page arrows, search, contents, its name and, inside the app, the close button. Zoom, text size and the other view buttons are in the menu; on narrow screens more of the bar moves there, but the page arrows always stay (2026-10-22)
- The Markdown Reader opens only the i360 library's books — our own books and the books the i360 search has indexed — and reads them from the library itself. «نسخ رابط هذه الصفحة» copies the Reader's public link, also inside the app (2026-10-22)

### Added
- The Markdown Reader now opens inside the app instead of the browser, with a close button back to the encyclopedia (2026-10-22)
- The Reader no longer freezes on very large books: it builds a book's pages a little at a time, starting with the page you open it at and moving outward from there (whatever is on screen first), with a row under the toolbar showing the download and then the preparation, in percent; the screen, the close button and the back button keep working meanwhile, and search becomes available once the book is ready (2026-10-22)
- The Reader's connection icon now checks the connection for real, so it also turns red on Android phones and on Wi-Fi without internet (2026-10-22)
- The book search («البحث في i360إ») now opens inside the app, with a close button back to the encyclopedia. Its book results open in the Reader inside the app, and the Reader's close button returns to the results; articles and other outside results open in the phone's browser overlay (2026-10-22)

---

## [0.14.0] — 2026-10-22

First store release since 0.13.2. It also brings to the stores everything that had reached installed apps over the air since 0.13.2.

### Added
- Android's back button: closes an open dialog first; on the home screen it then sends the app to the background, and inside the Daily Reflection it returns to the encyclopedia (2026-10-22)
- iPhone: swiping from the screen's edge goes back inside the app — from the Daily Reflection to the encyclopedia (2026-10-22)
- The Daily Reflection («التأمل اليومي») now opens inside the app instead of the browser, with a close button back to the encyclopedia (2026-10-22)
- A theme choice in the bottom bar — follow the device, light, sepia or dark — shared with the Daily Reflection, the Markdown Reader and the i360 CSE; the chosen theme appears instantly at start, with no flash of the light one (2026-10-21)
- A numerals choice beside it — Western 456, Arabic-Indic ٤٥٦ or Persian/Urdu ۴۵۶ — applied to every number the app shows, including version numbers, which use the Arabic separator «٫» so the eastern zero isn't mistaken for a dot (2026-10-21)

### Changed
- iPhone: the app now starts up the way Apple's newest iOS tools require (the scene life cycle); without it, apps built with them close at launch (2026-10-22)
- Daily Reflection calculates prayer times on the device: your location is no longer sent anywhere. The city comes from the device's time zone, or can be picked by name; only a typed city name goes to the place search (2026-10-22)
- The search box recognises a chapter.verse typed in any of the three digit sets, with "." or «٫» (2026-10-21)
- The dividers in the science list now follow the chosen theme and are lightly visible (2026-10-21)
- The app's colours and its Amiri typeface now come from the shared i360 theme, the same single source used by the Daily Reflection, the Markdown Reader and the i360 CSE — the app looks exactly as before, and keeps the same colours even if the theme can't be reached (2026-10-17)
- Fonts are now served from i360's own copy instead of Google Fonts, removing a dependency on an outside service (2026-10-17)
- Resource links have one consistent way of opening: if the in-app browser can't open a page, it opens in a new tab instead, rather than silently doing nothing (2026-10-03)
- Only one resource opens at a time, with a short "checking" indicator while a site's availability is confirmed; if the device blocks the page from opening, the app offers to try again (2026-10-03)
- Translation requests now give up after 10 seconds instead of waiting indefinitely on a slow connection (2026-10-03)
- New app icons for browsers and home screens: a sharper browser-tab icon, a dedicated icon for Android's shaped (round/squircle) launchers, and an opaque iPhone home-screen icon (2026-10-03)

### Fixed
- On Android, applying or rolling back an over-the-air update no longer reloads the app twice (update component 2.3.3) (2026-10-22)
- Searching again for the same term after closing its results works again; only accidental double-taps are ignored (2026-10-16)
- A failed data load could mark the app's content as up to date, so the next successful start skipped the download it actually needed; the app now records that only after the download succeeds (2026-10-03)
- Problem reports keep the actual reason a data load failed across automatic retries, and a report is now copied before anything else happens, as iPhone's browser requires (2026-10-03)

### Security
- The app's native layer updated to Capacitor 8.5.3, which blocks remote content from being loaded at the app's own address (a critical advisory) (2026-10-22)
- Pages opened in a new tab can no longer reach back into the app's own page (2026-10-03)
- The web app now sends standard browser security headers (no content-type guessing, no embedding in other sites' frames, limited referrer information) (2026-10-03, live 2026-10-18)
- Only the app's own scripts can run on its page, on the web and in the installed apps alike (a Content Security Policy) (2026-10-21)

---

## [0.13.2] — 2026-09-07

### Added
- An optional "report this problem" action, available whenever data fails to load or an over-the-air update gets automatically reverted — copies the relevant details and opens a pre-filled email, using the same mechanism already behind the app's existing crash-report button
- A notice shown if an over-the-air update ever genuinely fails and automatically reverts to the previous, working version — with the same optional report action
- Release notes for Google Play and Huawei AppGallery can now be entered once, at commit time, alongside the version number, and are applied to both stores automatically on a real submission
- A safeguard warning developers if web-app changes are about to be released over-the-air while a related native-code change hasn't yet been submitted to the app stores — preventing a mismatch that could otherwise break the app for anyone not yet on the newer native build

### Changed
- The data-loading error screen redesigned: a single, tappable status indicator now covers "loading," "retrying," and "failed" states together, opening a details-and-report dialog on tap rather than showing a separate button inline
- The app's own "am I healthy?" signal to the over-the-air update system now waits for a genuine, successful data load (with a generous 45-second grace period for slow connections) rather than firing immediately on startup — a genuinely broken update can now be caught and automatically reverted, rather than always being treated as healthy regardless of whether data actually loaded

### Fixed
- A real production incident where a scripts-only, non-app-affecting commit somehow published a genuine over-the-air update, which turned out to be broken — traced to the iOS release path lacking a safeguard the Android path already had; both paths now share the same protection
- A bug where the one-time privacy notice could reopen repeatedly during a persistent data-loading failure
- A genuine, though rare, false-positive pattern where the "is this website reachable?" check would warn a site was unreachable even though it loaded fine when actually opened — caused by some sites treating the check itself differently from a real visit

### Removed
- An unused navigation library, no longer needed now that the app has a single screen (also trims roughly 37 KB from the app's download size)
- Several small, genuinely unused code paths, and a leftover third-party "share" dependency that hadn't actually been called from anywhere since an earlier redesign

### Security
- Resolved a previously-deferred security advisory in the navigation library by removing it entirely, as a direct result of the cleanup above

---

## [0.13.1] — 2026-09-04

### Added
- A paperclip button next to relevant resources, opening a linked supplementary webpage via the same in-app browsing resources already use
- A proactive "is this reachable?" check before opening a resource, with a brief on-screen confirmation on success and a warning (with an option to continue anyway) if the site appears unreachable
- An automated version-bump and release-metadata workflow for the development team: prompts for a new version at commit time, calculates the current Hijri date from an official source, and writes the release record to Baserow automatically on a real store submission

### Changed
- Resource links and search results now open in the device's own, full system browser (Custom Tabs / SFSafariViewController) instead of an embedded in-app view — matches how a real browser tab behaves, including the system's own share/back/exit controls
- The app's internal "runtime version" — used to keep over-the-air updates correctly matched to the installed native app — is now derived automatically from the app's own version number, rather than needing a manual update on every native change

### Fixed
- A real navigation bug where the in-app browser's Home and Refresh buttons didn't reliably work
- A header-sizing bug where the app's title could wrap onto two lines on some narrower phones — replaced with genuine on-device measurement rather than fixed-size breakpoints
- A real bug where a native-code update could silently keep running outdated JavaScript logic after a fresh install, until the next background sync — closed by the automatic version tie-in above

### Removed
- The original in-app browser (a full embedded page within the app) — fully replaced by opening resources in the device's own system browser

---

## [0.13.0] — 2026-08-19

### Complete Platform Rewrite (SAP Build Apps / AppGyver → React + TypeScript + Vite)

This release replaces the original low-code SAP Build Apps (AppGyver) implementation with a from-scratch, hand-built codebase. It's the same app and the same experience for users, rebuilt on a modern, maintainable foundation that supports faster iteration and richer functionality going forward.

### Added

**Platform & distribution**
- Progressive Web App (Firebase Hosting) alongside native Android, iOS, and Huawei AppGallery builds — all four surfaces built from one shared codebase
- Over-the-air (OTA) updates for the native apps: most JavaScript and asset changes now reach installed apps directly, without waiting on app-store review
- Fully automated release pipeline: every code push automatically deploys the web app and, where relevant, ships an OTA update or prepares a store submission
- iOS builds now also run through Apple's Xcode Cloud, providing automatic build validation on every push independent of any single developer machine

**In-app features**
- Desktop preview mode: a three-way simulator lets the team preview Google Play, Huawei AppGallery, and Apple App Store link behavior directly from a desktop browser, without needing physical test devices for every platform
- Automatic retry for content loading — a failed data fetch now retries quietly in the background with a visible "retrying" indicator, rather than requiring the user to force-close and reopen the app
- Local caching for science-category and Qur'an data, so repeat visits load without waiting on the network
- A unified search bar that auto-detects Arabic vs. other input and offers translation, chapter/verse lookup, or web search from a single field
- One-time privacy notice and update-announcement dialogs for new editions/versions

**Design**
- Full right-to-left (RTL) Arabic interface, set in the Amiri typeface throughout
- A refreshed visual identity: a brand color palette tuned for readability and colorblind-safe contrast, a custom ornamental divider motif, and branded app icons and splash screens across all platforms

### Changed
- Content aggregation now spans multiple sources in a single interface: structured science/resource data, Google Programmable Search, the Internet Archive, and an AI chat assistant, alongside direct links to curated apps, websites, and books
- Desktop behavior standardized: tapping any external resource always opens a new browser tab rather than an embedded in-app view, avoiding compatibility issues with sites that refuse to be embedded
- Science categories reorganized into a clearer three-level hierarchy (major discipline → sub-discipline → specific topic) for easier browsing
- Startup and navigation performance improved substantially: the home screen's code bundle shrank from roughly 900 KB to 16 KB, and icons now load on demand instead of all at once
- Android package size reduced by about 40% through more aggressive build optimization
- Upgraded the core routing library to its latest major version, resolving known security advisories in the process

### Fixed
- A real, previously hard-to-reproduce bug where content would intermittently fail to load mid-session — root-caused to the app's own network resilience (not the platform) and resolved with automatic retry
- A field-mapping issue that could open the wrong content for a given science category
- A settings control (the virtual-keyboard button) that silently didn't work due to a backend field-naming mismatch
- Several duplicate, inconsistent implementations of platform-detection logic unified into one correct, shared source of truth
- A CSS specificity issue that prevented icons from displaying their intended color
- Minor search-input inconsistencies around whitespace handling

### Security
- Resolved two known vulnerabilities in the routing library via the version upgrade noted above
- Hardened release automation to prevent a stale local build configuration from ever being shipped to real users
- Reviewed and confirmed public-facing API credentials are scoped appropriately (e.g., read-only where write access isn't required)

### Removed
- Dead code identified during the rewrite: an unused legacy route, a service-worker dependency that was never actually wired up, and several app-level state variables that were written but never read

### Platform Notes
- Huawei AppGallery support covers Android-based Huawei devices (EMUI and HarmonyOS through version 4); HarmonyOS NEXT has dropped Android app compatibility at the OS level, which is outside this app's control
- Dark mode was evaluated and deliberately not implemented — the in-app browser view displays external websites that can't follow an in-app theme regardless, so the benefit wouldn't be consistent

### In Progress
- Final QA pass ahead of full production rollout: physical-device testing across additional iPhone hardware, and a broader accessibility review

---

## [0.12.4] and earlier

Original implementation, built on SAP Build Apps (AppGyver). See prior release history for details.
