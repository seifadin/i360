# i360-md — i360 Markdown Reader hosting

Firebase Hosting site **`i360-md`** in project **`i360-e`** → https://i360-md.web.app/

Separate from the i360إ app: its own folder, its own `firebase.json`, deployed only with the
`md` target. It never touches `https://i360-e.web.app/` or the app's pre-push pipeline.

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
