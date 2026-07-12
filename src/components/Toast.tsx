import { useEffect } from 'react'

interface ToastProps {
  message: string
  show: boolean
  durationMs?: number
  onHide?: () => void
}

// Positioned via a wrapping container by the caller (Home.tsx places it
// directly above the search bar). `show` is the single source of truth for
// visibility — the toast is visible exactly as long as `show` is true.
// `durationMs` is optional: if provided, onHide() fires automatically after
// that many ms (the caller is expected to flip `show` to false in response).
// Omit `durationMs` to tie visibility directly to real state (e.g. a loading
// flag) with no artificial timer.
export default function Toast({ message, show, durationMs, onHide }: ToastProps) {
  useEffect(() => {
    if (!show || !durationMs) return
    const timer = setTimeout(() => onHide?.(), durationMs)
    return () => clearTimeout(timer)
  }, [show, durationMs, onHide])

  if (!show) return null

  return (
    <div className="pointer-events-none flex justify-center pb-2">
      <div className="rounded-full border border-gray-200 bg-brand-ivory px-4 py-1 text-xs text-brand-blue shadow-md">
        {message}
      </div>
    </div>
  )
}
