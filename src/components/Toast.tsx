import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  show: boolean
  durationMs?: number
  onHide?: () => void
}

// Positioned via a wrapping container by the caller (Home.tsx places it
// directly above the search bar). This component only handles the
// show/auto-hide timing and visual bubble.
export default function Toast({ message, show, durationMs = 500, onHide }: ToastProps) {
  const [visible, setVisible] = useState(show)

  useEffect(() => {
    if (!show) return
    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
      onHide?.()
    }, durationMs)
    return () => clearTimeout(timer)
  }, [show, durationMs])

  if (!visible) return null

  return (
    <div className="pointer-events-none flex justify-center pb-2">
      <div
        className="rounded-full px-4 py-1 text-xs text-white shadow-md"
        style={{ backgroundColor: '#0010CF' }}
      >
        {message}
      </div>
    </div>
  )
}
