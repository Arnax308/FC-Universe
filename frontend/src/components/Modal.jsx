import { useEffect, useRef } from 'react'
import { Icon } from './ui'

export default function Modal({ open, onClose, title, children, banner }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose() }}
      aria-label={title}
      className="m-auto w-[min(42rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border-2 border-flood bg-night-800 p-0 text-chalk shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      {banner}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
        <h2 className="text-2xl">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-chalk-dim hover:bg-white/10 hover:text-chalk">
          <Icon name="close" className="text-2xl" />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
    </dialog>
  )
}
