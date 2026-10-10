# i360-md — i360 Markdown Reader hosting

Firebase project **`i360-md`** (its default Hosting site) → https://i360-md.web.app/

Separate from the i360إ app (Firebase project `i360-e`): its own Firebase project, repo and
config, so its traffic, storage and deploys can never affect `https://i360-e.web.app/`.

## Layout
```
public/index.html     the reader (i360-md-reader.html, renamed)
public/books/*.md     books exported by the i360 OCR Engine
```
Link to a book: `https://i360-md.web.app/?file=books/NAME.md`
Link to a page: add `#p=45` (or `#p=2:45` for volume 2, page 45).

## Deploy
```
firebase deploy --only hosting:md
```
Run from this folder. Always name the `md` target: a plain `firebase deploy` here also
deploys only this site (the config has no other), but the explicit form is the habit that
stays safe.

## Updating the reader
Replace `public/index.html` with the new `i360-md-reader.html` and deploy.
Never edit the reader's script by hand inside `index.html`: its security policy allows only
the exact scripts it was built with, so a hand edit makes the browser block it.

## Book file names
Use plain Latin letters, digits and hyphens (e.g. `fatawa-v5.md`): they appear in links.
