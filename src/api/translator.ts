const TRANSLATOR_URL_DEFAULT = import.meta.env.VITE_TRANSLATOR_URL
const TRANSLATOR_KEY = import.meta.env.VITE_TRANSLATOR_KEY

// ─── Arabic detection ─────────────────────────────────────────────────────────

export function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text)
}

// ─── Translator ───────────────────────────────────────────────────────────────

// translatorUrl: sourced from i360dbc.Translator (Baserow) — a COMPLETE,
// ready-to-use URL with its own query params already baked in (e.g.
// api-version/from/to/profanityAction), used as-is, not appended to.
// Falls back to VITE_TRANSLATOR_URL (a bare base URL) if the Baserow field
// is empty or not yet loaded — only the fallback needs params appended.
// The API key stays a fixed env var regardless — a secret shouldn't live in
// a shared Baserow table with broader read access.
export async function translateToArabic(text: string, translatorUrl?: string): Promise<string> {
  if (isArabic(text)) return text
  const url = translatorUrl || `${TRANSLATOR_URL_DEFAULT}?api-version=3.0&to=ar`

  const res = await fetch(
    url,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': TRANSLATOR_KEY,
        'Ocp-Apim-Subscription-Region': 'global',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ text }]),
    }
  )
  if (!res.ok) throw new Error(`translateToArabic failed: ${res.status}`)
  const data = await res.json()
  return data[0]?.translations[0]?.text ?? text
}
