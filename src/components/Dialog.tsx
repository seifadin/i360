interface DialogProps {
  open: boolean
  title: string
  message: string
  onClose: () => void
}

export default function Dialog({ open, title, message, onClose }: DialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-right shadow-xl">
        <h2 className="mb-2 text-base font-bold" style={{ color: '#0010CF' }}>
          {title}
        </h2>
        <p className="mb-4 text-sm leading-relaxed" style={{ color: '#0010CF', whiteSpace: 'pre-line' }}>
          {message}
        </p>
        <button
          onClick={onClose}
          className="w-full rounded-full py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: '#0010CF' }}
        >
          موافق
        </button>
      </div>
    </div>
  )
}
