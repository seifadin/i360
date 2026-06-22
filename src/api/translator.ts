const TRANSLATOR_URL = import.meta.env.VITE_TRANSLATOR_URL
const TRANSLATOR_KEY = import.meta.env.VITE_TRANSLATOR_KEY

// ─── Arabic detection ─────────────────────────────────────────────────────────

export function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text)
}

// ─── Translator ───────────────────────────────────────────────────────────────

export async function translateToArabic(text: string): Promise<string> {
  if (isArabic(text)) return text

  const res = await fetch(
    `${TRANSLATOR_URL}?api-version=3.0&to=ar`,
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
