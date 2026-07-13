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
      <div className="w-full max-w-sm rounded-2xl bg-brand-ivory p-5 text-right shadow-xl">
        <h2 className="mb-2 text-lg font-bold text-brand-blue">
          {title}
        </h2>
        <p className="mb-4 whitespace-pre-line text-base leading-relaxed text-brand-blue">
          {message}
        </p>
        <button
          onClick={onClose}
          className="w-full rounded-full bg-brand-blue py-2 text-base font-bold text-white"
        >
          موافق
        </button>
      </div>
    </div>
  )
}
