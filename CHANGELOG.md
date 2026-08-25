# Changelog

All notable changes to **i360إ** (الموسوعة الإسلامية) are documented in this file.

i360إ is an Arabic-only Islamic knowledge discovery app that organizes Islamic resources — apps, websites, and books — by discipline (Qur'an, Tafsir, Tajweed, Hadith, and more), aggregated from several content sources into a single searchable interface.

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
