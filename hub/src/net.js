// Network requests with a time limit: an answer that never comes must not hang the page.
// Shared by the hub pages (bundled into each by scripts/build.js) and the i360إ app (imported
// as '@i360/net'; its types come from the JSDoc below).

/** A pause, e.g. between two tries. @param {number} ms @returns {Promise<void>} */
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// fetch(), aborted after `timeout` ms. The limit also covers `read` (reading the answer), when
// one is given; without one the Response is returned as soon as it arrives.
/**
 * @template [T=Response]
 * @param {string} url
 * @param {RequestInit & { timeout?: number }} [init]
 * @param {(response: Response) => T | Promise<T>} [read]
 * @returns {Promise<T>}
 */
export async function fetchWithTimeout(url, { timeout = 8000, ...options } = {}, read = (response) => /** @type {any} */ (response)) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => { if (controller) controller.abort(); }, timeout);
  try {
    return await read(await fetch(url, { ...options, signal: controller ? controller.signal : undefined }));
  } finally {
    clearTimeout(timer);
  }
}

// JSON with a time limit and bounded retries: no retry on 4xx (except 429), otherwise up to
// `retries` more attempts, `backoff` ms apart and doubling. An HTTP error carries its .status.
/**
 * @param {string} url
 * @param {RequestInit & { timeout?: number, retries?: number, backoff?: number }} [init]
 * @returns {Promise<any>}
 */
export async function fetchJson(url, { timeout = 6000, retries = 1, backoff = 800, ...options } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchWithTimeout(url, { timeout, ...options }, (r) => {
        if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
        return r.json();
      });
    } catch (e) {
      const permanent = e.status && e.status >= 400 && e.status < 500 && e.status !== 429;
      if (permanent || attempt >= retries) throw e;
      await wait(backoff * 2 ** attempt);
    }
  }
}
