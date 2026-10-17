# i360-hub — the i360 side tools in one site

Firebase project ID **`i360-md`** (display name `i360-hub`), separate from the i360إ app
(project `i360-e`), so its traffic, storage and deploys can never affect `https://i360-e.web.app/`.

## Sites (Hosting targets)
| Target | Site | Role |
|---|---|---|
| `hub` | https://i360-hub.web.app/ | the apps (folder `public-hub/`) |
| `md`  | https://i360-md.web.app/  | forwards to `/md/` (path and `?…` kept) |
| `cse` | https://i360-cse.web.app/ | forwards to `/cse/` |
| `day` | https://i360-day.web.app/ | forwards to `/day/` |

The three apps share one site so they share saved settings (e.g. the theme).

## Layout
```
public-hub/index.html      landing page          (built from src/hub.src.html)
public-hub/md/index.html   the Reader            (built from src/reader.src.html)
public-hub/md/books/*.md   books exported by the i360 OCR Engine
public-hub/cse/index.html  the i360 CSE          (built from src/cse.src.html)
public-hub/day/index.html  Glance, daily reflection (copied from src/day.html)
public-hub/robots.txt
forward/404.html           fallback for the forwarding sites
```
Link to a book: `https://i360-hub.web.app/md/?file=books/NAME.md`
Link to a page: add `#p=45` (or `#p=2:45` for volume 2, page 45).

## Build and deploy
```
npm test && npm run build
firebase deploy --only hosting:hub
```
The forwarders rarely change: `firebase deploy --only hosting:md,hosting:cse,hosting:day`.
Always name the target(s).

Never edit the built pages in `public-hub/` by hand: edit `src/`, then build. The pages'
security policy allows only the exact scripts they were built with, so a hand edit makes
the browser block them. (Glance has no build placeholders; edit `src/day.html`.)

## Shared theme (theme.i36o.workers.dev)
The colours and fonts of every i360 app, from one place (`theme/`):
```
theme/site/theme.css         variables (--i360-…) for light, sepia, dark; @font-face (written by fonts.js)
theme/site/theme-loader.js   the loader: applies the shared choice, refreshes theme.css
theme/site/fonts/<font>/<version>/   Amiri, Amiri Quran (.woff2) and their licence (OFL.txt)
theme/site/_headers          CORS everywhere; theme files no-cache; fonts immutable
theme/early.js               built into each page's <head> (no flash on a repeat visit)
theme/fallbacks.js           plain colours for color-mix values; each page's built-in colours
theme/fonts.js, woff2.js     font check and update (from the @fontsource npm packages)
theme/wrangler.jsonc         the theme Worker (files only)
```
- **The hub's pages** (landing page, Reader, CSE) build in the built-in colours, `early.js`
  and the loader (`window.i360Theme`), so the theme button also works offline. New colours
  and fonts on the theme site reach them without a rebuild; a change to the loader needs one.
  One theme choice is shared by all of them.
- **Publishing:** `.github/workflows/theme-publish.yml`, on every push to `main` that
  changes `theme/` (or by hand: Actions → Theme publish, or `npm run publish-theme`).
- **Colours:** after changing a colour that a `color-mix` is made from,
  `node theme/fallbacks.js --write` (`npm test` and the workflow stop while one is stale).

## Pushing: `npm run push`
Use it instead of `git push` (arguments pass through: `npm run push -- origin main`):
1. asks npm whether Amiri or Amiri Quran has a newer version;
2. if so: downloads it into a new version folder, checks that every character of the
   current font is still there (every Quranic mark), rewrites the Fonts section of
   `theme.css`, runs `npm test` and commits it on its own ("Fonts: …");
3. pushes — always. Anything that went wrong in 1–2 is shown as a warning with its
   cause, and a half-done font update is undone first.

`npm run fonts-check` only reports. `.github/workflows/fonts-check.yml` runs the check on
the 1st of each month and fails on purpose when a newer font exists (GitHub emails you).

## Book file names
Use plain Latin letters, digits and hyphens (e.g. `fatawa-v5.md`): they appear in links.
