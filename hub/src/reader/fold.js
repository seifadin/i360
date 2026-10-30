// The Reader's toolbar levels: what folds away, in order, when the bar runs out of room — read by
// fittingToolbar() (src/page-chrome.js; level 0 has everything on the bar). `to` names a
// <template data-slot> in src/reader.src.html (in ⋮, or bookmark's box); a `flag` is a class on
// the bar that the Reader's CSS acts on. Its own file, with no page code, so test/reader-fold.test.js
// can check it against the HTML. The page arrows and number, ⋮, theme, numerals, contents and ✕
// never fold; direction always lives in ⋮.
export const READER_FOLD = [
  { items: ['group-text'], to: 'text' },                     // 1: text size into ⋮
  { items: ['group-zoom'], to: 'zoom' },                     // 2: zoom into ⋮
  { items: ['group-mark', 'group-acts'], to: 'actions', flag: 'acts-folded' },   // 3: bookmark … reading mode
  { flag: 'notitle' },                                       // 4: the title hidden
  { items: ['status-icon', 'btn-open-file', 'btn-search-toggle'], to: 'fold-row', flag: 'folded' },   // 5: ⋮'s first row
  { flag: 'nopos' },                                         // 6: the file position "(12/70)" hidden (still in the box's tooltip)
  { dense: 1 },                                              // 7: tighter spacing
  { flag: 'no-total' },                                      // 8: the "of N" total hidden
  { items: ['vol-select'], to: 'volume' },                   // 9: the volume menu into ⋮
  { dense: 2 },                                              // 10: the narrowest buttons (very narrow screens, large text)
  { items: ['btn-copy-link'], to: 'copy-link' }              // 11: last resort, copy link into bookmark's box
];
