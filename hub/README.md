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
theme/site/theme.css         variables (--i360-…) for light, sepia, dark + @font-face
theme/site/theme-loader.js   the one module: applies the shared choice, refreshes theme.css
theme/site/fonts/            Amiri, Amiri Quran (OFL 1.1, licences beside them)
theme/site/_headers          CORS everywhere; theme files no-cache; fonts immutable
theme/early.js               inlined in each app's <head> (no flash on a repeat visit)
theme/fallbacks.js           plain colours for color-mix values; each app's built-in fallback
theme/wrangler.jsonc         the theme Worker (files only)
```
Published by `.github/workflows/theme-publish.yml` on every push to `main` that
changes `theme/` (or by hand: Actions → Theme publish, or `npm run publish-theme`).
After changing a colour that a `color-mix` is made from: `node theme/fallbacks.js --write`
(`npm test` and the workflow stop while a fallback is out of date).
Font files are cached for a year: a new font version goes in a new folder.

## Book file names
Use plain Latin letters, digits and hyphens (e.g. `fatawa-v5.md`): they appear in links.
