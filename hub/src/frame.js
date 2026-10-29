// Work that follows the layout (a resize, a scroll, an element changing size) runs at
// most once per frame, however many times it is asked for in between: oncePerFrame(fn)
// returns a function that queues fn for the next frame unless it is already queued, and
// tells whether it did (true) or fn was queued already (false).
// Shared by the hub pages; bundled into each by scripts/build.js.
export function oncePerFrame(fn) {
  let queued = false;
  return () => {
    if (queued) return false;
    queued = true;
    requestAnimationFrame(() => { queued = false; fn(); });
    return true;
  };
}
